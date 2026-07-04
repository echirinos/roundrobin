"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  Eye,
  LogIn,
  RefreshCw,
  RotateCcw,
  Trophy,
  Users,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PlaySyncLogo } from "@/components/brand/playsync-logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ShineBorder } from "@/components/ui/shine-border";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ThemeToggle } from "@/components/theme-toggle";
import { NumberTicker } from "@/components/ui/number-ticker";
import type { LocalPlayer, LocalRoundGame, LocalStanding } from "@/src/types/database";
import type { EventSettings } from "@/src/types/formats";
import {
  createDefaultEventSettings,
  FORMAT_DEFINITIONS,
} from "@/src/types/formats";
import { EnhancedPlayerSetup } from "@/src/components/tournaments/enhanced-player-setup";
import { EnhancedSchedule } from "@/src/components/tournaments/enhanced-schedule";
import {
  CourtLeaderboard,
  RotatingLeaderboard,
} from "@/src/components/scoring/rotating-leaderboard";
import {
  SessionShareSheet,
  type LiveSyncStatus,
} from "@/src/components/tournaments/session-share-sheet";
import { calculateStandingsForFormat, getDefaultCourtWeights } from "@/src/lib/formats/scoring";
import { generateRound, type GeneratorContext } from "@/src/lib/formats/rotating-generators";
import {
  createTeamsFromPlayers,
  generateFixedRound,
} from "@/src/lib/formats/fixed-generators";
import {
  getSessionStats,
  normalizeSessionCode,
  type LiveSessionRecord,
  type LiveTournamentSnapshot,
} from "@/src/lib/live-session";
import { isFixedPartnerFormat } from "@/src/types/formats";

const STORAGE_KEY = "playsync-tournament-v3";
const SESSION_CODE_STORAGE_KEY = "playsync-live-session-code-v1";
// Proof of session ownership: minted by the server on publish, required for
// every snapshot write. Keyed by code so stale codes don't leak old tokens.
const ORGANIZER_TOKEN_STORAGE_PREFIX = "playsync-organizer-token-v1:";

type TournamentTab = "setup" | "schedule" | "standings";

interface TournamentState {
  id: string;
  name: string;
  players: LocalPlayer[];
  games: LocalRoundGame[];
  settings: EventSettings;
  currentRound: number;
  tournamentStarted: boolean;
  createdAt: string;
}

const createInitialState = (): TournamentState => ({
  id: Math.random().toString(36).substring(2, 9),
  name: "New Tournament",
  players: [],
  games: [],
  settings: createDefaultEventSettings("popcorn"),
  currentRound: 0,
  tournamentStarted: false,
  createdAt: new Date().toISOString(),
});

function buildSnapshot(state: TournamentState): LiveTournamentSnapshot {
  return {
    ...state,
    updatedAt: new Date().toISOString(),
  };
}

// Restored state (remote snapshot or localStorage) can carry formats this
// bundle doesn't know — newer publisher, downgraded client, corrupted storage.
// Normalize so every downstream FORMAT_DEFINITIONS lookup is safe.
function normalizeSettings(settings: EventSettings): EventSettings {
  return FORMAT_DEFINITIONS[settings?.format]
    ? settings
    : { ...settings, format: "popcorn" as const };
}

function stateFromSnapshot(snapshot: LiveTournamentSnapshot): TournamentState {
  return {
    ...snapshot,
    settings: normalizeSettings(snapshot.settings),
  };
}

function buildUsedPartnerships(games: LocalRoundGame[]): Set<string> {
  const partnerships = new Set<string>();

  for (const game of games) {
    partnerships.add(game.team1.map((player) => player.id).sort().join("-"));
    partnerships.add(game.team2.map((player) => player.id).sort().join("-"));
  }

  return partnerships;
}

function shouldUseFixedTeams(settings: EventSettings): boolean {
  return settings.partnerMode === "fixed" || isFixedPartnerFormat(settings.format);
}

function generateGamesForRound({
  players,
  games,
  standings,
  settings,
  nextRound,
}: {
  players: LocalPlayer[];
  games: LocalRoundGame[];
  standings: LocalStanding[];
  settings: EventSettings;
  nextRound: number;
}): LocalRoundGame[] {
  if (shouldUseFixedTeams(settings)) {
    return generateFixedRound({
      teams: createTeamsFromPlayers(players),
      existingGames: games,
      currentRound: nextRound,
      settings,
    }).games;
  }

  const context: GeneratorContext = {
    players,
    existingGames: games,
    standings,
    currentRound: nextRound,
    settings,
    usedPartnerships: buildUsedPartnerships(games),
  };

  return generateRound(context).games;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Something went wrong. Try again.";
}

function getShareUrl(origin: string, code: string | null): string {
  if (!origin || !code) return "";
  return `${origin}/tournament?code=${code}`;
}

function formatSyncTime(value: string | null): string {
  if (!value) return "Not live yet";

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function TournamentPage() {
  const [state, setState] = useState<TournamentState>(createInitialState);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSpectator, setIsSpectator] = useState(false);
  const [activeTab, setActiveTab] = useState<TournamentTab>("setup");
  const [previousStandings, setPreviousStandings] = useState<LocalStanding[]>([]);
  const [sessionCode, setSessionCode] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [showJoinPrompt, setShowJoinPrompt] = useState(false);
  const [origin, setOrigin] = useState("");
  const [syncStatus, setSyncStatus] = useState<LiveSyncStatus>("local");
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  // Bumped on reset so EnhancedPlayerSetup remounts and drops its lazy state.
  const [setupEpoch, setSetupEpoch] = useState(0);
  const setupTabRef = useRef<HTMLButtonElement>(null);
  const pendingSetupFocus = useRef(false);

  const snapshot = useMemo(() => buildSnapshot(state), [state]);
  const sessionStats = useMemo(() => getSessionStats(snapshot), [snapshot]);
  // Fixed-partner standings show one row per TEAM (like Pickleheads Rumble):
  // both partners share identical records, so one representative per pair
  // carries the team name and the exact team record.
  const standingsPlayers = useMemo(() => {
    if (!shouldUseFixedTeams(state.settings)) return state.players;

    const teamRows: LocalPlayer[] = [];
    for (let i = 0; i + 1 < state.players.length; i += 2) {
      teamRows.push({
        ...state.players[i],
        name: `${state.players[i].name} & ${state.players[i + 1].name}`,
      });
    }
    if (state.players.length % 2 === 1) {
      teamRows.push(state.players[state.players.length - 1]);
    }
    return teamRows;
  }, [state.players, state.settings]);
  const shareUrl = useMemo(
    () => getShareUrl(origin, sessionCode),
    [origin, sessionCode]
  );

  const fetchLiveSession = useCallback(
    async (code: string, options?: { silent?: boolean }) => {
      const normalizedCode = normalizeSessionCode(code);

      if (!normalizedCode) {
        setSyncStatus("error");
        setSyncError("Enter a valid 6-character session code.");
        return false;
      }

      if (!options?.silent) {
        setSyncStatus("syncing");
      }

      try {
        const response = await fetch(`/api/sessions/${normalizedCode}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(
            response.status === 404
              ? "No live session found for that code."
              : "Unable to load the live session."
          );
        }

        const record = (await response.json()) as LiveSessionRecord;
        setState(stateFromSnapshot(record.snapshot));
        setSessionCode(record.code);
        setLastSyncedAt(record.updatedAt);
        setSyncStatus("live");
        setSyncError(null);
        // Only steer the tab on an explicit load — the background poll also
        // lands here every few seconds, and forcing the tab would yank a
        // spectator off Standings/Players while they're reading it.
        if (!options?.silent) {
          setActiveTab(record.snapshot.tournamentStarted ? "schedule" : "setup");
        }

        return true;
      } catch (error) {
        setSyncStatus("error");
        setSyncError(getErrorMessage(error));

        return false;
      }
    },
    []
  );

  // Load local organizer state or remote spectator state on mount.
  useEffect(() => {
    let isCancelled = false;

    async function hydrate() {
      const params = new URLSearchParams(window.location.search);
      const queryCode = normalizeSessionCode(
        params.get("code") ?? params.get("session")
      );
      const role = params.get("role");
      const requestedNewSession = params.get("new") === "1";
      const requestedJoin = params.get("join") === "1";
      const requestedMode = params.get("mode");
      const requestedSettings =
        requestedMode === "fixed"
          ? createDefaultEventSettings("shuffle")
          : requestedMode === "rotating"
          ? createDefaultEventSettings("popcorn")
          : null;

      setOrigin(window.location.origin);
      setShowJoinPrompt(requestedJoin);

      if (queryCode && role !== "organizer") {
        setIsSpectator(true);
        setSessionCode(queryCode);
        await fetchLiveSession(queryCode);

        if (!isCancelled) {
          setIsLoaded(true);
        }

        return;
      }

      if (requestedNewSession) {
        const nextState = createInitialState();
        setState(
          requestedSettings
            ? { ...nextState, settings: requestedSettings }
            : nextState
        );
        setActiveTab("setup");
        setSessionCode(null);
        setShowJoinPrompt(false);
        setSyncStatus("local");
        setSyncError(null);
        setLastSyncedAt(null);
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(SESSION_CODE_STORAGE_KEY);
        window.history.replaceState(null, "", "/tournament");

        if (!isCancelled) {
          setIsLoaded(true);
        }

        return;
      }

      const saved = localStorage.getItem(STORAGE_KEY);
      const savedCode = normalizeSessionCode(
        queryCode || localStorage.getItem(SESSION_CODE_STORAGE_KEY)
      );

      if (saved) {
        try {
          const parsed = JSON.parse(saved) as TournamentState;
          setState({
            ...parsed,
            settings: normalizeSettings(parsed.settings),
          });
          setActiveTab(parsed.tournamentStarted ? "schedule" : "setup");
        } catch (error) {
          console.error("Failed to load saved tournament:", error);
        }
      } else if (requestedSettings) {
        setState((prev) => ({ ...prev, settings: requestedSettings }));
        setActiveTab("setup");
        window.history.replaceState(null, "", "/tournament");
      }

      if (savedCode) {
        setSessionCode(savedCode);
        setSyncStatus("live");
      }

      if (!isCancelled) {
        setIsLoaded(true);
      }
    }

    void hydrate();

    return () => {
      isCancelled = true;
    };
  }, [fetchLiveSession]);

  // Save organizer state locally. Spectator state is a read-only remote mirror.
  useEffect(() => {
    if (isLoaded && !isSpectator) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [state, isLoaded, isSpectator]);


  const publishSession = useCallback(
    async (requestedCode?: string | null) => {
      if (isSpectator) return;

      const normalizedCode = normalizeSessionCode(requestedCode ?? sessionCode);
      setSyncStatus(normalizedCode ? "syncing" : "publishing");

      const storedToken = normalizedCode
        ? localStorage.getItem(
            `${ORGANIZER_TOKEN_STORAGE_PREFIX}${normalizedCode}`
          )
        : null;
      const snapshot = buildSnapshot(state);

      const send = (method: "PUT" | "POST", endpoint: string) =>
        fetch(endpoint, {
          method,
          headers: {
            "Content-Type": "application/json",
            ...(storedToken ? { "x-organizer-token": storedToken } : {}),
          },
          body: JSON.stringify({
            code: normalizedCode || undefined,
            snapshot,
          }),
        });

      try {
        let response = normalizedCode
          ? await send("PUT", `/api/sessions/${normalizedCode}`)
          : await send("POST", "/api/sessions");

        // A 404 means the session expired (24h TTL) or predates this deploy;
        // a 401 means we have no token for it (same situation from the
        // client's side). Re-create it under the same code — the server
        // honors our stored token or mints a fresh one.
        if (
          normalizedCode &&
          (response.status === 404 || response.status === 401)
        ) {
          response = await send("POST", "/api/sessions");
        }

        if (response.status === 403) {
          throw new Error(
            "This code belongs to another organizer's session. Reset to publish under a new code."
          );
        }

        if (!response.ok) {
          throw new Error("Unable to publish this live session.");
        }

        const record = (await response.json()) as LiveSessionRecord & {
          organizerToken?: string;
        };
        setSessionCode(record.code);
        setLastSyncedAt(record.updatedAt);
        setSyncStatus("live");
        setSyncError(null);
        localStorage.setItem(SESSION_CODE_STORAGE_KEY, record.code);
        if (record.organizerToken) {
          localStorage.setItem(
            `${ORGANIZER_TOKEN_STORAGE_PREFIX}${record.code}`,
            record.organizerToken
          );
        }
      } catch (error) {
        setSyncStatus("error");
        setSyncError(getErrorMessage(error));
      }
    },
    [isSpectator, sessionCode, state]
  );

  // Once an organizer has published a code, push score/status changes live.
  useEffect(() => {
    if (!isLoaded || isSpectator || !sessionCode) return;

    const timeout = window.setTimeout(() => {
      void publishSession(sessionCode);
    }, 700);

    return () => window.clearTimeout(timeout);
  }, [isLoaded, isSpectator, publishSession, sessionCode, state]);

  // Spectators poll for live changes.
  useEffect(() => {
    if (!isLoaded || !isSpectator || !sessionCode) return;

    const interval = window.setInterval(() => {
      void fetchLiveSession(sessionCode, { silent: true });
    }, 4000);

    return () => window.clearInterval(interval);
  }, [fetchLiveSession, isLoaded, isSpectator, sessionCode]);

  const courtWeights = useMemo(
    () => getDefaultCourtWeights(state.settings.numberOfCourts),
    [state.settings.numberOfCourts]
  );

  // Players who already appear in a completed game can't be removed while
  // editing the roster mid-session — their scores are baked into standings.
  const lockedPlayerIds = useMemo(() => {
    const ids = new Set<string>();
    for (const game of state.games) {
      if (!game.completed) continue;
      for (const player of [...game.team1, ...game.team2]) {
        ids.add(player.id);
      }
    }
    return ids;
  }, [state.games]);

  const standings = useMemo(() => {
    if (standingsPlayers.length === 0) return [];
    return calculateStandingsForFormat(standingsPlayers, state.games, {
      scoringType: state.settings.scoringType,
      courtWeights,
      includePointDifferential: true,
    });
  }, [standingsPlayers, state.games, state.settings.scoringType, courtWeights]);

  const handlePlayersChange = useCallback(
    (players: LocalPlayer[]) => {
      if (isSpectator) return;

      setState((prev) => ({
        ...prev,
        players,
      }));
    },
    [isSpectator]
  );

  const handleSessionNameChange = useCallback(
    (name: string) => {
      if (isSpectator) return;
      setState((prev) => ({ ...prev, name }));
    },
    [isSpectator]
  );

  const handleSettingsChange = useCallback(
    (settings: EventSettings) => {
      if (isSpectator) return;
      setState((prev) => ({ ...prev, settings }));
    },
    [isSpectator]
  );

  const handleStartTournament = useCallback(() => {
    if (isSpectator) return;

    try {
      const games = generateGamesForRound({
        players: state.players,
        games: [],
        standings: [],
        settings: state.settings,
        nextRound: 1,
      });
      setPreviousStandings([]);
      setState((prev) => ({
        ...prev,
        games,
        currentRound: 1,
        tournamentStarted: true,
      }));
      setActiveTab("schedule");
    } catch (error) {
      console.error("Failed to generate first round:", error);
    }
  }, [isSpectator, state.players, state.settings]);

  const handleUpdateGame = useCallback(
    (gameId: string, team1Score: number, team2Score: number) => {
      if (isSpectator) return;

      setPreviousStandings(standings);

      setState((prev) => ({
        ...prev,
        games: prev.games.map((game) =>
          game.id === gameId
            ? { ...game, team1Score, team2Score, completed: true }
            : game
        ),
      }));
    },
    [isSpectator, standings]
  );

  const handleAddRound = useCallback(
    (newGames: LocalRoundGame[]) => {
      if (isSpectator) return;

      setPreviousStandings(standings);

      setState((prev) => ({
        ...prev,
        games: [...prev.games, ...newGames],
        currentRound: prev.currentRound + 1,
      }));
    },
    [isSpectator, standings]
  );

  // Recover from an accidentally confirmed round: drop the latest round's
  // games (and any scores entered on them) and step the round counter back.
  const handleRemoveRound = useCallback(
    (roundNumber: number) => {
      if (isSpectator) return;

      setState((prev) => {
        // Only the latest round can be removed — deleting an earlier round
        // would invalidate every round seeded after it.
        if (roundNumber !== prev.currentRound || roundNumber < 1) return prev;

        return {
          ...prev,
          games: prev.games.filter((game) => game.round !== roundNumber),
          currentRound: roundNumber - 1,
          // Undoing Round 1 usually means a roster or format mistake —
          // reopen setup so those are editable again instead of stranding
          // the session at "Round 0" with a locked roster.
          tournamentStarted: roundNumber > 1 ? prev.tournamentStarted : false,
        };
      });
      if (roundNumber === 1) {
        setActiveTab("setup");
      }
      // Rank-change deltas against the deleted round's scores are meaningless.
      setPreviousStandings([]);
    },
    [isSpectator]
  );

  const handleResetTournament = useCallback(() => {
    if (isSpectator) return;
    setShowResetConfirm(true);
  }, [isSpectator]);

  const confirmResetTournament = useCallback(() => {
    if (isSpectator) return;

    setShowResetConfirm(false);
    setState(createInitialState());
    setPreviousStandings([]);
    setSessionCode(null);
    setSyncStatus("local");
    setSyncError(null);
    setLastSyncedAt(null);
    setShowJoinPrompt(false);
    setActiveTab("setup");
    setSetupEpoch((epoch) => epoch + 1);
    localStorage.removeItem(STORAGE_KEY);
    if (sessionCode) {
      localStorage.removeItem(
        `${ORGANIZER_TOKEN_STORAGE_PREFIX}${sessionCode}`
      );
    }
    localStorage.removeItem(SESSION_CODE_STORAGE_KEY);
  }, [isSpectator, sessionCode]);

  const handleJoinSession = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const normalizedCode = normalizeSessionCode(joinCode);

      if (!normalizedCode) {
        setSyncStatus("error");
        setSyncError("Enter a valid session code.");
        return;
      }

      window.location.assign(`/tournament?code=${normalizedCode}`);
    },
    [joinCode]
  );

  const handleStartOwnSession = useCallback(() => {
    setShowJoinPrompt(false);
    setActiveTab("setup");
    // Clear any lingering join errors so they don't leak into the create view.
    setSyncStatus("local");
    setSyncError(null);
    setJoinCode("");
    pendingSetupFocus.current = true;
    // Drop ?join=1 so a refresh lands on setup, not the join prompt.
    window.history.replaceState(null, "", "/tournament");
  }, []);

  // Live-session snapshots can carry formats this bundle doesn't know yet
  // (stale spectator client) — fall back instead of white-screening.
  const formatDefinition =
    FORMAT_DEFINITIONS[state.settings.format] ?? FORMAT_DEFINITIONS.popcorn;
  const isLive = Boolean(sessionCode) && syncStatus === "live";
  // Join arrivals (?join=1) see only the code entry until they opt into setup.
  const isJoinMode = showJoinPrompt && !isSpectator && !state.tournamentStarted;

  // Move focus to the Setup tab after leaving the join prompt.
  useEffect(() => {
    if (!isJoinMode && pendingSetupFocus.current) {
      pendingSetupFocus.current = false;
      setupTabRef.current?.focus();
    }
  }, [isJoinMode]);
  const shouldShowSessionHero =
    state.tournamentStarted ||
    isSpectator ||
    Boolean(sessionCode) ||
    Boolean(syncError);
  const statCards = [
    {
      label: "Players",
      value: state.players.length,
      icon: Users,
      tone: "text-primary",
    },
    {
      label: "Round",
      value: state.currentRound || 0,
      icon: Trophy,
      tone: "text-accent",
    },
    {
      label: "Done",
      value: sessionStats.completionPercent,
      icon: Activity,
      tone: "text-success",
      suffix: "%",
    },
  ];

  const joinSessionForm = (
    <form
      onSubmit={handleJoinSession}
      className="flex flex-col gap-2 rounded-lg border border-border/70 bg-background/60 p-3 shadow-sm backdrop-blur sm:flex-row"
    >
      <Input
        value={joinCode}
        onChange={(event) =>
          setJoinCode(normalizeSessionCode(event.target.value))
        }
        placeholder="Join with code"
        maxLength={6}
        className="h-11 text-center font-semibold uppercase tracking-[0.25em] sm:text-left"
        aria-label="Join a live session by code"
      />
      <Button
        type="submit"
        className="h-11 sm:w-36"
        data-analytics-event="session_code_submit_clicked"
        data-analytics-location="tournament_join_form"
      >
        <LogIn data-icon="inline-start" />
        Join
      </Button>
    </form>
  );

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="size-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading session...</p>
        </div>
      </div>
    );
  }

  return (
    // --app-header-h keeps the sticky TabsList offset in lockstep with the
    // fixed header height so the tabs never tuck under a taller header.
    <div className="court-app-bg min-h-screen [--app-header-h:3.5rem]">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/78 backdrop-blur-xl">
        <div className="mx-auto flex h-(--app-header-h) max-w-6xl items-center justify-between gap-3 px-3 sm:px-4">
          <Link
            href="/"
            className="min-w-0 rounded-xl transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <PlaySyncLogo
              size="sm"
              wordmarkClassName="truncate text-base sm:text-lg"
            />
          </Link>
          <div className="flex min-w-0 items-center justify-end gap-2">
            {sessionCode && (
              <Badge variant="outline" className="hidden sm:inline-flex">
                <span>Code</span>
                {sessionCode}
              </Badge>
            )}
            {isSpectator ? (
              <Badge variant="secondary">
                <Eye className="size-3" />
                Spectating
              </Badge>
            ) : state.tournamentStarted ? (
              <Badge variant="secondary" className="hidden sm:inline-flex">
                Round {state.currentRound}
              </Badge>
            ) : (
              <Badge variant="secondary" className="hidden sm:inline-flex">
                Setup
              </Badge>
            )}
            {!isJoinMode && (
              <SessionShareSheet
                code={sessionCode}
                shareUrl={shareUrl}
                isReadOnly={isSpectator}
                stats={sessionStats}
                syncStatus={syncStatus}
                syncError={syncError}
                lastSyncedAt={lastSyncedAt}
                onPublish={() => publishSession(sessionCode)}
                onRefresh={() => {
                  if (sessionCode) {
                    void fetchLiveSession(sessionCode);
                  }
                }}
              />
            )}
            <ThemeToggle />
            {!isSpectator && state.tournamentStarted && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetTournament}
                aria-label="Reset tournament"
                className="min-h-11 min-w-11 text-destructive hover:text-destructive sm:min-h-9 sm:min-w-0"
              >
                <RotateCcw />
                <span className="hidden sm:inline">Reset</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-5 px-3 py-4 sm:px-4 sm:py-6">
        {isJoinMode && (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="premium-panel court-line-surface relative overflow-hidden rounded-lg p-4 sm:p-5"
          >
            <div className="relative z-10 mx-auto flex w-full max-w-md flex-col gap-4 py-4 sm:py-8">
              <div className="text-center">
                <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                  Join with session code
                </h1>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Enter the organizer&apos;s 6-character code to open the live
                  session.
                </p>
              </div>
              {joinSessionForm}
              {syncError && (
                <Alert variant="destructive">
                  <WifiOff />
                  <AlertTitle>Live session issue</AlertTitle>
                  <AlertDescription>{syncError}</AlertDescription>
                </Alert>
              )}
              <button
                type="button"
                onClick={handleStartOwnSession}
                className="touch-target self-center text-sm font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
                data-analytics-event="join_switch_to_setup_clicked"
                data-analytics-location="tournament_join_hero"
              >
                or start your own session
              </button>
            </div>
          </motion.section>
        )}

        {!isJoinMode && shouldShowSessionHero && (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="premium-panel court-line-surface relative overflow-hidden rounded-lg p-4 sm:p-5"
          >
            {isLive && (
              <ShineBorder
                borderWidth={1}
                duration={12}
                shineColor={["var(--live)", "var(--primary)", "var(--accent)"]}
              />
            )}
            <div className="relative z-10 flex flex-col gap-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={isLive ? "default" : "secondary"}
                      className={isLive ? "bg-live text-live-foreground" : undefined}
                    >
                      {isLive ? (
                        <Wifi className="size-3" />
                      ) : (
                        <WifiOff className="size-3" />
                      )}
                      {isSpectator
                        ? "Live spectator"
                        : isLive
                        ? "Live session"
                        : "Local session"}
                    </Badge>
                    <Badge variant="outline">{formatDefinition.name}</Badge>
                  </div>
                  <h1 className="font-display mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                    {state.tournamentStarted ? state.name : "Create round robin"}
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                    {state.tournamentStarted
                      ? `${state.players.length} players, ${sessionStats.statusLabel.toLowerCase()}`
                      : "Add names, keep the defaults, and start the first round from your phone."}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2 lg:w-[24rem]">
                  {statCards.map((item, index) => {
                    const StatIcon = item.icon;

                    return (
                      <motion.div
                        key={item.label}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          delay: 0.06 * index,
                          duration: 0.3,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                        className="rounded-lg border border-border/70 bg-background/65 p-3 text-center shadow-sm backdrop-blur"
                      >
                        <StatIcon className={`mx-auto size-4 ${item.tone}`} />
                        <div className="font-display mt-1 text-2xl font-semibold tracking-tight">
                          <NumberTicker value={item.value} startValue={0} />
                          {item.suffix}
                        </div>
                        <div className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                          {item.label}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-lg border border-border/70 bg-background/55 p-3 shadow-inner backdrop-blur">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium text-muted-foreground">
                    {sessionStats.statusLabel}
                  </span>
                  <span className="font-data font-semibold">
                    {sessionStats.completedGames}/{sessionStats.totalGames || 0} games
                  </span>
                </div>
                <Progress value={sessionStats.completionPercent} className="mt-2" />
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>
                    {sessionCode
                      ? `Code ${sessionCode}`
                      : "Publish to create a spectator code"}
                  </span>
                  <span>Last sync: {formatSyncTime(lastSyncedAt)}</span>
                </div>
              </div>

              {!isSpectator && !state.tournamentStarted && joinSessionForm}

              {syncError && (
                <Alert variant="destructive">
                  <WifiOff />
                  <AlertTitle>Live session issue</AlertTitle>
                  <AlertDescription>
                    {syncError}
                    {isSpectator && (
                      <a
                        href="/tournament?join=1"
                        className="touch-target mt-1 inline-flex items-center font-medium underline underline-offset-4"
                        data-analytics-event="join_retry_code_clicked"
                        data-analytics-location="spectator_sync_error"
                      >
                        Try a different code
                      </a>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </motion.section>
        )}

        {!isJoinMode && (
          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as TournamentTab)}
            className="flex flex-col gap-4"
          >
            <TabsList className="sticky top-(--app-header-h) z-40 grid h-12 w-full grid-cols-3 shadow-lg shadow-background/20">
              <TabsTrigger ref={setupTabRef} value="setup" className="text-sm">
                {state.tournamentStarted ? "Players" : "Setup"}
              </TabsTrigger>
              <TabsTrigger
                value="schedule"
                disabled={!state.tournamentStarted}
                className="text-sm"
              >
                Matches
              </TabsTrigger>
              <TabsTrigger
                value="standings"
                disabled={!state.tournamentStarted}
                className="text-sm"
              >
                Standings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="setup" className="mt-0">
              <EnhancedPlayerSetup
                key={setupEpoch}
                sessionName={state.name}
                onSessionNameChange={handleSessionNameChange}
                players={state.players}
                onPlayersChange={handlePlayersChange}
                settings={state.settings}
                onSettingsChange={handleSettingsChange}
                onStartTournament={handleStartTournament}
                tournamentStarted={state.tournamentStarted}
                readOnly={isSpectator}
                lockedPlayerIds={lockedPlayerIds}
              />
            </TabsContent>

            <TabsContent value="schedule" className="mt-0">
              {state.tournamentStarted && (
                <EnhancedSchedule
                  games={state.games}
                  players={state.players}
                  standings={standings}
                  settings={state.settings}
                  currentRound={state.currentRound}
                  onUpdateGame={handleUpdateGame}
                  onAddRound={handleAddRound}
                  onRemoveRound={handleRemoveRound}
                  readOnly={isSpectator}
                />
              )}
            </TabsContent>

            <TabsContent value="standings" className="mt-0">
              {state.tournamentStarted &&
                (state.settings.scoringType === "court_weighted" &&
                state.settings.numberOfCourts > 1 ? (
                  <div className="flex flex-col gap-4">
                    <RotatingLeaderboard
                      players={standingsPlayers}
                      games={state.games}
                      scoringType={state.settings.scoringType}
                      numberOfCourts={state.settings.numberOfCourts}
                      previousStandings={previousStandings}
                      showCourtAssignments
                    />
                    <CourtLeaderboard
                      standings={standings}
                      numberOfCourts={state.settings.numberOfCourts}
                    />
                  </div>
                ) : (
                  <RotatingLeaderboard
                    players={standingsPlayers}
                    games={state.games}
                    scoringType={state.settings.scoringType}
                    numberOfCourts={state.settings.numberOfCourts}
                    previousStandings={previousStandings}
                  />
                ))}
            </TabsContent>
          </Tabs>
        )}

        <div className="border-t border-border/40 pt-4 text-center">
          <p className="text-xs text-muted-foreground">
            Mobile-first round robin control with live spectator links.
          </p>
        </div>
      </main>

      <Dialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Reset tournament?</DialogTitle>
            <DialogDescription>
              All players, rounds, and scores will be lost. This can&apos;t be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setShowResetConfirm(false)}
              data-testid="reset-cancel"
            >
              Keep session
            </Button>
            <Button
              variant="destructive"
              onClick={confirmResetTournament}
              data-testid="reset-confirm"
            >
              Reset everything
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
