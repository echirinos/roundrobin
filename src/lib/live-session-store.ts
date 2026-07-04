import { Redis } from "@upstash/redis";
import {
  createSessionCode,
  isLiveTournamentSnapshot,
  normalizeSessionCode,
  type LiveSessionRecord,
  type LiveTournamentSnapshot,
} from "@/src/lib/live-session";

/**
 * Live sessions are ephemeral (one evening of play), so they live in Redis
 * with a TTL instead of a database: any serverless instance can read them,
 * they survive cold starts and redeploys, and they expire on their own.
 * Without Redis env vars (plain local dev), an in-memory Map keeps the same
 * API working for a single dev-server process.
 */

/** Sessions expire this long after their last write. */
const SESSION_TTL_SECONDS = 24 * 60 * 60;

const KEY_PREFIX = "live-session:v1:";

/** Server-side record: includes the organizer's write token. Never send this
 * shape to clients — strip it with toPublicRecord() first. */
export interface StoredLiveSessionRecord extends LiveSessionRecord {
  organizerToken?: string;
}

/** Thrown when a write presents a token that doesn't match the session's. */
export class UnauthorizedSessionWriteError extends Error {
  constructor() {
    super("Organizer token does not match this session");
    this.name = "UnauthorizedSessionWriteError";
  }
}

export function toPublicRecord(
  record: StoredLiveSessionRecord
): LiveSessionRecord {
  const publicRecord = { ...record };
  delete publicRecord.organizerToken;
  return publicRecord;
}

// ---------------------------------------------------------------------------
// Backing store: Upstash Redis when configured, in-memory Map otherwise.
// ---------------------------------------------------------------------------

const MEMORY_STORE_KEY = "__pickleball_round_robin_live_sessions__";

type SessionGlobal = typeof globalThis & {
  [MEMORY_STORE_KEY]?: Map<string, StoredLiveSessionRecord>;
};

function getMemoryStore(): Map<string, StoredLiveSessionRecord> {
  const globalStore = globalThis as SessionGlobal;

  if (!globalStore[MEMORY_STORE_KEY]) {
    globalStore[MEMORY_STORE_KEY] = new Map<string, StoredLiveSessionRecord>();
  }

  return globalStore[MEMORY_STORE_KEY];
}

let redisClient: Redis | null | undefined;

function getRedis(): Redis | null {
  if (redisClient !== undefined) return redisClient;

  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  redisClient = url && token ? new Redis({ url, token }) : null;

  if (!redisClient && process.env.NODE_ENV === "production") {
    console.warn(
      JSON.stringify({
        level: "warn",
        event: "live_session_store_memory_fallback",
        detail:
          "KV_REST_API_URL/KV_REST_API_TOKEN not set - live sessions will not survive instance recycling",
      })
    );
  }

  return redisClient;
}

async function readRecord(
  code: string
): Promise<StoredLiveSessionRecord | null> {
  const redis = getRedis();

  if (redis) {
    const record = await redis.get<StoredLiveSessionRecord>(
      `${KEY_PREFIX}${code}`
    );
    return record ?? null;
  }

  return getMemoryStore().get(code) ?? null;
}

async function writeRecord(record: StoredLiveSessionRecord): Promise<void> {
  const redis = getRedis();

  if (redis) {
    // TTL refreshes on every write, so an active session never expires
    // mid-evening; an abandoned one is gone within a day.
    await redis.set(`${KEY_PREFIX}${record.code}`, record, {
      ex: SESSION_TTL_SECONDS,
    });
    return;
  }

  getMemoryStore().set(record.code, record);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function upsertLiveSession(
  snapshot: LiveTournamentSnapshot,
  requestedCode?: string | null,
  providedToken?: string | null
): Promise<StoredLiveSessionRecord> {
  if (!isLiveTournamentSnapshot(snapshot)) {
    throw new Error("Invalid live tournament snapshot");
  }

  const now = new Date().toISOString();
  const normalizedCode = normalizeSessionCode(requestedCode);
  const code = normalizedCode || createSessionCode(snapshot.id);
  const existing = await readRecord(code);

  // An empty or blank token is "no token", never a value that could be stored
  // as ownership — otherwise a caller could POST a chosen code with token ""
  // and the falsy stored token would let any later write bypass the guard.
  const cleanToken =
    typeof providedToken === "string" && providedToken.trim().length > 0
      ? providedToken
      : undefined;

  // Writes to an owned session require the matching organizer token.
  // Sessions written before tokens existed (or by the dev fallback) are
  // adopted by the first writer that presents a token.
  if (existing?.organizerToken && existing.organizerToken !== cleanToken) {
    throw new UnauthorizedSessionWriteError();
  }

  // Always end up with a real, non-empty token: keep the existing owner,
  // adopt the caller's token for a tokenless legacy record, or mint one.
  const organizerToken =
    existing?.organizerToken ?? cleanToken ?? crypto.randomUUID();

  const record: StoredLiveSessionRecord = {
    code,
    organizerToken,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    snapshot: {
      ...snapshot,
      updatedAt: now,
    },
  };

  await writeRecord(record);

  return record;
}

export async function getLiveSession(
  code: string
): Promise<StoredLiveSessionRecord | null> {
  const normalizedCode = normalizeSessionCode(code);

  if (!normalizedCode) {
    return null;
  }

  return readRecord(normalizedCode);
}
