import {
  createSessionCode,
  isLiveTournamentSnapshot,
  normalizeSessionCode,
  type LiveSessionRecord,
  type LiveTournamentSnapshot,
  type PlayerCheckIn,
} from "@/src/lib/live-session";

const STORE_KEY = "__pickleball_round_robin_live_sessions__";

type SessionGlobal = typeof globalThis & {
  [STORE_KEY]?: Map<string, LiveSessionRecord>;
};

function getStore(): Map<string, LiveSessionRecord> {
  const globalStore = globalThis as SessionGlobal;

  if (!globalStore[STORE_KEY]) {
    globalStore[STORE_KEY] = new Map<string, LiveSessionRecord>();
  }

  return globalStore[STORE_KEY];
}

export function upsertLiveSession(
  snapshot: LiveTournamentSnapshot,
  requestedCode?: string | null
): LiveSessionRecord {
  if (!isLiveTournamentSnapshot(snapshot)) {
    throw new Error("Invalid live tournament snapshot");
  }

  const now = new Date().toISOString();
  const normalizedCode = normalizeSessionCode(requestedCode);
  const code = normalizedCode || createSessionCode(snapshot.id);
  const existing = getStore().get(code);
  const validPlayerIds = new Set(snapshot.players.map((player) => player.id));
  const mergedCheckIns = {
    ...(existing?.snapshot.checkIns ?? {}),
    ...(snapshot.checkIns ?? {}),
  };
  const filteredCheckIns = Object.fromEntries(
    Object.entries(mergedCheckIns).filter(([playerId]) =>
      validPlayerIds.has(playerId)
    )
  );
  const record: LiveSessionRecord = {
    code,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    snapshot: {
      ...snapshot,
      checkIns: filteredCheckIns,
      updatedAt: now,
    },
  };

  getStore().set(code, record);

  return record;
}

export function getLiveSession(code: string): LiveSessionRecord | null {
  const normalizedCode = normalizeSessionCode(code);

  if (!normalizedCode) {
    return null;
  }

  return getStore().get(normalizedCode) ?? null;
}

export function checkInPlayer(
  code: string,
  playerId: string
): LiveSessionRecord | null {
  const normalizedCode = normalizeSessionCode(code);
  const existing = getStore().get(normalizedCode);

  if (!existing) {
    return null;
  }

  const player = existing.snapshot.players.find(
    (candidate) => candidate.id === playerId
  );

  if (!player) {
    return null;
  }

  const now = new Date().toISOString();
  const checkIn: PlayerCheckIn = {
    playerId: player.id,
    playerName: player.name,
    checkedInAt: now,
  };
  const record: LiveSessionRecord = {
    ...existing,
    updatedAt: now,
    snapshot: {
      ...existing.snapshot,
      checkIns: {
        ...(existing.snapshot.checkIns ?? {}),
        [player.id]: checkIn,
      },
      updatedAt: now,
    },
  };

  getStore().set(normalizedCode, record);

  return record;
}
