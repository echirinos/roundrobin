"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  CheckCircle2,
  Eye,
  LogIn,
  RefreshCw,
  Trophy,
  UserCheck,
  Users,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  type PlayerCheckIn,
} from "@/src/lib/live-session";
import { isFixedPartnerFormat } from "@/src/types/formats";

const STORAGE_KEY = "playsync-tournament-v3";
const SESSION_CODE_STORAGE_KEY = "playsync-live-session-code-v1";
const CHECKIN_STORAGE_PREFIX = "playsync-checkin-player-v1-";

type TournamentTab = "setup" | "schedule" | "standings";

interface TournamentState {
  id: string;
  name: string;
  players: LocalPlayer[];
  games: LocalRoundGame[];
  settings: EventSettings;
  currentRound: number;
  tournamentStarted: boolean;
  checkIns: Record<string, PlayerCheckIn>;
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
  checkIns: {},
  createdAt: new Date().toISOString(),
});

function buildSnapshot(state: TournamentState): LiveTournamentSnapshot {
  return {
    ...state,
    checkIns: state.checkIns ?? {},
    updatedAt: new Date().toISOString(),
  };
}

function stateFromSnapshot(snapshot: LiveTournamentSnapshot): TournamentState {
  return {
    ...snapshot,
    checkIns: snapshot.checkIns ?? {},
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
  const [checkedInPlayerId, setCheckedInPlayerId] = useState<string | null>(null);

  const snapshot = useMemo(() => buildSnapshot(state), [state]);
  const sessionStats = useMemo(() => getSessionStats(snapshot), [snapshot]);
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
        setActiveTab(record.snapshot.tournamentStarted ? "schedule" : "setup");

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
            checkIns: parsed.checkIns ?? {},
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

  useEffect(() => {
    if (!isLoaded || !sessionCode) return;

    setCheckedInPlayerId(
      localStorage.getItem(`${CHECKIN_STORAGE_PREFIX}${sessionCode}`)
    );
  }, [isLoaded, sessionCode]);

  const publishSession = useCallback(
    async (requestedCode?: string | null) => {
      if (isSpectator) return;

      const normalizedCode = normalizeSessionCode(requestedCode ?? sessionCode);
      setSyncStatus(normalizedCode ? "syncing" : "publishing");

      try {
        const endpoint = normalizedCode
          ? `/api/sessions/${normalizedCode}`
          : "/api/sessions";
        const response = await fetch(endpoint, {
          method: normalizedCode ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            code: normalizedCode || undefined,
            snapshot: buildSnapshot(state),
          }),
        });

        if (!response.ok) {
          throw new Error("Unable to publish this live session.");
        }

        const record = (await response.json()) as LiveSessionRecord;
        setSessionCode(record.code);
        setLastSyncedAt(record.updatedAt);
        setSyncStatus("live");
        setSyncError(null);
        localStorage.setItem(SESSION_CODE_STORAGE_KEY, record.code);
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

  // Organizers poll too so player check-ins appear without a page refresh.
  useEffect(() => {
    if (!isLoaded || isSpectator || !sessionCode) return;

    const interval = window.setInterval(async () => {
      try {
        const response = await fetch(`/api/sessions/${sessionCode}`, {
          cache: "no-store",
        });

        if (!response.ok) return;

        const record = (await response.json()) as LiveSessionRecord;
        setLastSyncedAt(record.updatedAt);
        setState((prev) => ({
          ...prev,
          checkIns: {
            ...(prev.checkIns ?? {}),
            ...(record.snapshot.checkIns ?? {}),
          },
        }));
      } catch (error) {
        console.error("Failed to refresh live check-ins:", error);
      }
    }, 5000);

    return () => window.clearInterval(interval);
  }, [isLoaded, isSpectator, sessionCode]);

  const courtWeights = useMemo(
    () => getDefaultCourtWeights(state.settings.numberOfCourts),
    [state.settings.numberOfCourts]
  );

  const standings = useMemo(() => {
    if (state.players.length === 0) return [];
    return calculateStandingsForFormat(state.players, state.games, {
      scoringType: state.settings.scoringType,
      courtWeights,
      includePointDifferential: true,
    });
  }, [state.players, state.games, state.settings.scoringType, courtWeights]);

  const handlePlayersChange = useCallback(
    (players: LocalPlayer[]) => {
      if (isSpectator) return;
      const playerIds = new Set(players.map((player) => player.id));

      setState((prev) => ({
        ...prev,
        players,
        checkIns: Object.fromEntries(
          Object.entries(prev.checkIns ?? {}).filter(([playerId]) =>
            playerIds.has(playerId)
          )
        ),
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

  const handleCheckIn = useCallback(
    async (playerId: string) => {
      if (!sessionCode) return;

      setSyncStatus("syncing");

      try {
        const response = await fetch(`/api/sessions/${sessionCode}/check-in`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ playerId }),
        });

        if (!response.ok) {
          throw new Error("Unable to check in for this session.");
        }

        const record = (await response.json()) as LiveSessionRecord;
        setState(stateFromSnapshot(record.snapshot));
        setLastSyncedAt(record.updatedAt);
        setSyncStatus("live");
        setSyncError(null);
        setCheckedInPlayerId(playerId);
        localStorage.setItem(`${CHECKIN_STORAGE_PREFIX}${sessionCode}`, playerId);
      } catch (error) {
        setSyncStatus("error");
        setSyncError(getErrorMessage(error));
      }
    },
    [sessionCode]
  );

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

  const handleResetTournament = useCallback(() => {
    if (isSpectator) return;

    if (window.confirm("Reset tournament? All data will be lost.")) {
      setState(createInitialState());
      setPreviousStandings([]);
      setSessionCode(null);
      setSyncStatus("local");
      setSyncError(null);
      setLastSyncedAt(null);
      setShowJoinPrompt(false);
      setActiveTab("setup");
      localStorage.removeItem(STORAGE_KEY);
      if (sessionCode) {
        localStorage.removeItem(`${CHECKIN_STORAGE_PREFIX}${sessionCode}`);
      }
      localStorage.removeItem(SESSION_CODE_STORAGE_KEY);
    }
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

  const formatDefinition = FORMAT_DEFINITIONS[state.settings.format];
  const isLive = Boolean(sessionCode) && syncStatus === "live";
  const shouldShowSessionHero =
    state.tournamentStarted ||
    isSpectator ||
    Boolean(sessionCode) ||
    Boolean(syncError) ||
    showJoinPrompt;
  const checkedInPlayer = state.players.find(
    (player) => player.id === checkedInPlayerId
  );
  const statCards = [
    {
      label: "Players",
      value: state.players.length,
      icon: Users,
      tone: "text-primary",
    },
    {
      label: "Checked",
      value: sessionStats.checkedInPlayers,
      icon: UserCheck,
      tone: "text-live",
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
    <div className="court-app-bg min-h-screen">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/78 backdrop-blur-xl">
        <div className="mx-auto flex min-h-14 max-w-6xl items-center justify-between gap-3 px-3 py-2 sm:px-4">
          <Link href="/" className="flex min-w-0 items-center gap-2">
            <div className="court-line-surface flex size-9 shrink-0 items-center justify-center rounded-lg border border-primary/35 text-primary-foreground shadow-sm">
              <Activity className="size-4" />
            </div>
            <span className="font-display truncate text-lg font-semibold tracking-tight">
              PlaySync
            </span>
          </Link>
          <div className="flex min-w-0 items-center justify-end gap-2">
            {sessionCode && (
              <Badge variant="outline" className="hidden sm:inline-flex">
                Code {sessionCode}
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
            <ThemeToggle />
            {!isSpectator && state.tournamentStarted && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetTournament}
                className="hidden text-destructive hover:text-destructive sm:inline-flex"
              >
                Reset
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-5 px-3 py-4 sm:px-4 sm:py-6">
        {shouldShowSessionHero && (
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
                    {state.tournamentStarted
                      ? state.name
                      : showJoinPrompt
                      ? "Join with session code"
                      : "Create round robin"}
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                    {showJoinPrompt && !state.tournamentStarted
                      ? "Enter the organizer's 6-character code to open the live session."
                      : state.tournamentStarted
                      ? `${state.players.length} players, ${sessionStats.statusLabel.toLowerCase()}`
                      : "Add names, keep the defaults, and start the first round from your phone."}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:w-[30rem]">
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

              {!isSpectator && !state.tournamentStarted && (
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
                  <Button type="submit" className="h-11 sm:w-36">
                    <LogIn data-icon="inline-start" />
                    Join
                  </Button>
                </form>
              )}

              {isSpectator && sessionCode && state.players.length > 0 && (
                <div className="flex flex-col gap-3 rounded-lg border border-border/70 bg-background/60 p-3 shadow-sm backdrop-blur">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-display text-sm font-semibold">
                        Check in
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        {checkedInPlayer
                          ? `You are checked in as ${checkedInPlayer.name}.`
                          : "Tap your name so the organizer knows who is here."}
                      </p>
                    </div>
                    <Badge variant="outline">
                      {sessionStats.checkedInPlayers}/{sessionStats.totalPlayers}
                    </Badge>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {state.players.map((player) => {
                      const isCheckedIn = Boolean(state.checkIns[player.id]);
                      const isThisDevice = checkedInPlayerId === player.id;

                      return (
                        <Button
                          key={player.id}
                          type="button"
                          variant={isThisDevice ? "default" : "outline"}
                          className="h-auto justify-start py-3 text-left"
                          onClick={() => void handleCheckIn(player.id)}
                        >
                          {isCheckedIn && <CheckCircle2 data-icon="inline-start" />}
                          <span className="min-w-0 truncate">{player.name}</span>
                          {isCheckedIn && !isThisDevice && (
                            <span className="ml-auto text-xs text-muted-foreground">
                              Here
                            </span>
                          )}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}

              {syncError && (
                <Alert variant="destructive">
                  <WifiOff />
                  <AlertTitle>Live session issue</AlertTitle>
                  <AlertDescription>{syncError}</AlertDescription>
                </Alert>
              )}
            </div>
          </motion.section>
        )}

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as TournamentTab)}
          className="flex flex-col gap-4"
        >
          <TabsList className="sticky top-14 z-40 grid h-12 w-full grid-cols-3 shadow-lg shadow-background/20">
            <TabsTrigger value="setup" className="text-sm">
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
              sessionName={state.name}
              onSessionNameChange={handleSessionNameChange}
              players={state.players}
              onPlayersChange={handlePlayersChange}
              settings={state.settings}
              onSettingsChange={handleSettingsChange}
              onStartTournament={handleStartTournament}
              tournamentStarted={state.tournamentStarted}
              readOnly={isSpectator}
              checkIns={state.checkIns}
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
                    players={state.players}
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
                  players={state.players}
                  games={state.games}
                  scoringType={state.settings.scoringType}
                  numberOfCourts={state.settings.numberOfCourts}
                  previousStandings={previousStandings}
                />
              ))}
          </TabsContent>
        </Tabs>

        <div className="border-t border-border/40 pt-4 text-center">
          <p className="text-xs text-muted-foreground">
            Mobile-first round robin control with live spectator links.
          </p>
        </div>
      </main>
    </div>
  );
}
