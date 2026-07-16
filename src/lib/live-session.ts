import type { LocalPlayer, LocalRoundGame } from "@/src/types/database";
import type { EventSettings } from "@/src/types/formats";

export interface LiveTournamentSnapshot {
  id: string;
  name: string;
  players: LocalPlayer[];
  games: LocalRoundGame[];
  settings: EventSettings;
  currentRound: number;
  tournamentStarted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LiveSessionRecord {
  code: string;
  snapshot: LiveTournamentSnapshot;
  createdAt: string;
  updatedAt: string;
}

export interface SessionStats {
  completedGames: number;
  totalGames: number;
  completionPercent: number;
  currentRoundGames: number;
  currentRoundCompleted: number;
  totalPlayers: number;
  statusLabel: string;
  /**
   * True while a started session has unscored games in its current round.
   * When true, progressPercent/progressLabel track THAT round (matching the
   * "Round N live" statusLabel); otherwise they cover the whole session.
   * Derived here once so the hero and the share sheet can never disagree.
   */
  roundInProgress: boolean;
  progressPercent: number;
  progressLabel: string;
}

const CODE_LENGTH = 6;

export function normalizeSessionCode(value: string | null | undefined): string {
  return (value ?? "")
    .replace(/[^a-z0-9]/gi, "")
    .slice(0, CODE_LENGTH)
    .toUpperCase();
}

export function createSessionCode(seed: string): string {
  const normalized = normalizeSessionCode(seed);

  if (normalized.length === CODE_LENGTH) {
    return normalized;
  }

  const suffix = Math.random().toString(36).slice(2, CODE_LENGTH + 2);
  return normalizeSessionCode(`${normalized}${suffix}`).padEnd(CODE_LENGTH, "0");
}

// A real session (up to a few dozen players and a full evening of rounds)
// serializes well under ~200KB. Cap generously so one malformed or hostile
// POST can't park a huge blob in the shared store for 24h.
export const MAX_SNAPSHOT_PLAYERS = 200;
export const MAX_SNAPSHOT_GAMES = 2000;

export function isLiveTournamentSnapshot(
  value: unknown
): value is LiveTournamentSnapshot {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<LiveTournamentSnapshot>;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.name === "string" &&
    Array.isArray(candidate.players) &&
    candidate.players.length <= MAX_SNAPSHOT_PLAYERS &&
    Array.isArray(candidate.games) &&
    candidate.games.length <= MAX_SNAPSHOT_GAMES &&
    typeof candidate.settings === "object" &&
    typeof candidate.currentRound === "number" &&
    typeof candidate.tournamentStarted === "boolean" &&
    typeof candidate.createdAt === "string"
  );
}

export function getSessionStats(snapshot: LiveTournamentSnapshot): SessionStats {
  const totalGames = snapshot.games.length;
  const completedGames = snapshot.games.filter((game) => game.completed).length;
  const currentRoundGames = snapshot.games.filter(
    (game) => game.round === snapshot.currentRound
  );
  const currentRoundCompleted = currentRoundGames.filter(
    (game) => game.completed
  ).length;
  const totalPlayers = snapshot.players.length;
  const completionPercent =
    totalGames > 0 ? Math.round((completedGames / totalGames) * 100) : 0;

  let statusLabel = "Setup";

  if (snapshot.tournamentStarted && totalGames === 0) {
    statusLabel = "Waiting for round";
  } else if (
    snapshot.tournamentStarted &&
    currentRoundGames.length > 0 &&
    currentRoundCompleted === currentRoundGames.length
  ) {
    statusLabel = "Between rounds";
  } else if (snapshot.tournamentStarted) {
    statusLabel = `Round ${snapshot.currentRound} live`;
  }

  const roundInProgress =
    snapshot.tournamentStarted &&
    currentRoundGames.length > 0 &&
    currentRoundCompleted < currentRoundGames.length;
  const progressPercent = roundInProgress
    ? Math.round((currentRoundCompleted / currentRoundGames.length) * 100)
    : completionPercent;
  const progressLabel = roundInProgress
    ? `${currentRoundCompleted}/${currentRoundGames.length} games this round`
    : `${completedGames}/${totalGames} games`;

  return {
    completedGames,
    totalGames,
    completionPercent,
    currentRoundGames: currentRoundGames.length,
    currentRoundCompleted,
    totalPlayers,
    statusLabel,
    roundInProgress,
    progressPercent,
    progressLabel,
  };
}
