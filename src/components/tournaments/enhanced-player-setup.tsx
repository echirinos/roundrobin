"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ClipboardList,
  LayoutGrid,
  LogIn,
  Minus,
  Play,
  Plus,
  Settings2,
  Trash2,
  Trophy,
  UserPlus,
  Users,
  UsersRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import type { LocalPlayer } from "@/src/types/database";
import type { EventFormat, EventSettings } from "@/src/types/formats";
import {
  FORMAT_DEFINITIONS,
  createDefaultEventSettings,
} from "@/src/types/formats";
import type { PlayerCheckIn } from "@/src/lib/live-session";
import { generateId } from "@/src/lib/formats/rotating-generators";
import { FormatSettingsForm } from "./format-settings-form";
import { DuprLogin, DuprPlayerCard } from "@/src/components/dupr/dupr-login";
import { DuprIdInput } from "@/src/components/dupr/dupr-search";
import type { DuprPlayer } from "@/src/lib/dupr/types";
import { DUPR_CONFIG } from "@/src/lib/dupr/config";

interface EnhancedPlayerSetupProps {
  sessionName: string;
  onSessionNameChange: (name: string) => void;
  players: LocalPlayer[];
  onPlayersChange: (players: LocalPlayer[]) => void;
  settings: EventSettings;
  onSettingsChange: (settings: EventSettings) => void;
  onStartTournament: () => void;
  tournamentStarted: boolean;
  readOnly?: boolean;
  checkIns?: Record<string, PlayerCheckIn>;
}

type SessionMode = "rotating" | "fixed";
type WizardStep = 1 | 2 | 3;

const MAX_SETUP_COURTS = 24;
const STEP1_MIN_PLAYERS = 4;
const ROTATING_PRIMARY_FORMATS: EventFormat[] = [
  "popcorn",
  "gauntlet",
  "king_of_court",
  "up_down_river",
  "round_robin",
];
const ROTATING_MORE_FORMATS: EventFormat[] = [
  "scramble",
  "mixed_madness",
  "double_header",
  "cream_crop",
  "claim_throne",
];
const FIXED_FORMATS: EventFormat[] = ["shuffle", "team_gauntlet", "bracket", "milp"];
const RECOMMENDED_FORMAT: EventFormat = "popcorn";

const WIZARD_STEPS: Array<{ step: WizardStep; title: string }> = [
  { step: 1, title: "Who's playing?" },
  { step: 2, title: "Pick a format" },
  { step: 3, title: "Review & start" },
];

const PLAY_MODE_HELP_TEXT: Partial<Record<EventFormat, string>> = {
  popcorn: "Best default for casual groups. Shuffle and play.",
  gauntlet: "More competitive. Winners get harder games.",
  king_of_court: "Winners move up. Losers move down.",
  up_down_river: "Top 2 move up, bottom 2 move down.",
  round_robin: "Unique partners first. Great for 7 rounds.",
  scramble: "Small court groups with less movement.",
  mixed_madness: "Mixed doubles with balanced teams.",
  double_header: "Two games with the same partner.",
  cream_crop: "Sort by skill, then compete.",
  claim_throne: "Defend the top court.",
  shuffle: "Keep partners. Rotate opponents.",
  team_gauntlet: "Keep partners. Winning teams draw harder opponents.",
  bracket: "Win-and-advance tournament bracket.",
  milp: "League-style team rotation.",
};

function getScoringLabel(format: EventFormat): string {
  const scoringType = FORMAT_DEFINITIONS[format].scoringType;

  if (scoringType === "court_weighted") return "Court ladder";
  if (scoringType === "games_won") return "Games won";
  if (scoringType === "points") return "Points";

  return "Win %";
}

function preserveCommonSettings(
  nextSettings: EventSettings,
  currentSettings: EventSettings
): EventSettings {
  return {
    ...nextSettings,
    numberOfCourts: currentSettings.numberOfCourts,
    pointsToWin: currentSettings.pointsToWin,
    winBy: currentSettings.winBy,
    maxRounds:
      nextSettings.format === currentSettings.format
        ? currentSettings.maxRounds
        : nextSettings.maxRounds,
    courtOptimizer: currentSettings.courtOptimizer,
  };
}

function getFixedTeams(players: LocalPlayer[]) {
  const teams: Array<{
    index: number;
    player1: LocalPlayer;
    player2?: LocalPlayer;
  }> = [];

  for (let index = 0; index < players.length; index += 2) {
    teams.push({
      index: index / 2,
      player1: players[index],
      player2: players[index + 1],
    });
  }

  return teams;
}

type RosterTeam = ReturnType<typeof getFixedTeams>[number];

function TeamRow({
  team,
  checkIns,
  onRemove,
}: {
  team: RosterTeam;
  checkIns: Record<string, PlayerCheckIn>;
  onRemove?: () => void;
}) {
  const isCheckedIn =
    !!team.player2 &&
    team.player1.id in checkIns &&
    team.player2.id in checkIns;

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-lg border bg-background/60 py-2 pl-3",
        onRemove ? "pr-2" : "pr-3",
        !team.player2 && "border-destructive/50 bg-destructive/10"
      )}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Team {team.index + 1}</Badge>
          {team.player2 ? (
            isCheckedIn && (
              <Badge variant="outline">
                <CheckCircle2 className="size-3" />
                Checked in
              </Badge>
            )
          ) : (
            <Badge variant="destructive">Needs partner</Badge>
          )}
        </div>
        <p className="mt-2 truncate text-sm font-medium">
          {team.player1.name}
          {team.player2 ? ` & ${team.player2.name}` : ""}
        </p>
      </div>
      {onRemove && (
        <Button
          type="button"
          variant="ghost"
          size="icon-lg"
          onClick={onRemove}
          aria-label={`Remove team ${team.index + 1}`}
          className="shrink-0 text-muted-foreground hover:text-destructive"
        >
          <Trash2 />
        </Button>
      )}
    </div>
  );
}

function PlayerRow({
  player,
  checkIns,
  onRemove,
}: {
  player: LocalPlayer;
  checkIns: Record<string, PlayerCheckIn>;
  onRemove?: () => void;
}) {
  const duprPlayer = player as DuprPlayer;
  const hasDupr = !!duprPlayer.duprId || !!duprPlayer.duprRating;

  if (hasDupr) {
    return <DuprPlayerCard player={duprPlayer} onRemove={onRemove} compact />;
  }

  return (
    <div
      className={cn(
        "flex min-h-13 items-center justify-between gap-3 rounded-lg border border-border/70 bg-background/60 py-1 pl-3",
        onRemove ? "pr-1" : "pr-3"
      )}
    >
      <span className="flex min-w-0 items-center gap-2">
        {checkIns[player.id] && (
          <CheckCircle2 className="size-4 shrink-0 text-success" />
        )}
        <span className="truncate text-sm font-medium">{player.name}</span>
      </span>
      {onRemove && (
        <Button
          type="button"
          variant="ghost"
          size="icon-lg"
          onClick={onRemove}
          aria-label={`Remove ${player.name}`}
          className="shrink-0 text-muted-foreground hover:text-destructive"
        >
          <X />
        </Button>
      )}
    </div>
  );
}

function splitPlayerNames(value: string): string[] {
  return value
    .split(/[\n,;]+/)
    .map((name) => name.trim())
    .filter(Boolean);
}

function parseTeamRows(value: string): Array<[string, string]> {
  const rows = value
    .split(/\n+/)
    .map((row) => row.trim())
    .filter(Boolean);
  const teams: Array<[string, string]> = [];
  const looseNames: string[] = [];

  for (const row of rows) {
    const names = row
      .split(/\s*(?:&|\+|\/|,|\band\b)\s*/i)
      .map((name) => name.trim())
      .filter(Boolean);

    if (names.length >= 2) {
      teams.push([names[0], names[1]]);
    } else {
      looseNames.push(row);
    }
  }

  for (let index = 0; index < looseNames.length - 1; index += 2) {
    teams.push([looseNames[index], looseNames[index + 1]]);
  }

  return teams;
}

function buildLocalPlayer(name: string): LocalPlayer {
  return { id: generateId(), name };
}

function getMaxUsableCourts(playerCount: number): number {
  return Math.max(1, Math.floor(playerCount / 4));
}

function getCourtCountForPlayers(playerCount: number, requestedCourts: number): number {
  return Math.max(1, Math.min(requestedCourts, getMaxUsableCourts(playerCount)));
}

function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function SummaryRow({
  icon: Icon,
  label,
  value,
  caption,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  caption?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border/70 bg-background/55 p-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-semibold">{value}</p>
        {caption && (
          <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
            {caption}
          </p>
        )}
      </div>
    </div>
  );
}

function SummaryStepperRow({
  icon: Icon,
  label,
  value,
  caption,
  onStep,
  canDecrement,
  canIncrement,
  decrementLabel,
  incrementLabel,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  caption?: string;
  onStep: (delta: number) => void;
  canDecrement: boolean;
  canIncrement: boolean;
  decrementLabel: string;
  incrementLabel: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border/70 bg-background/55 p-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {caption && (
          <p className="text-xs leading-snug text-muted-foreground">{caption}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon-lg"
          onClick={() => {
            if (canDecrement) onStep(-1);
          }}
          aria-disabled={!canDecrement}
          className={
            canDecrement
              ? undefined
              : "opacity-50 shadow-none hover:translate-y-0 active:translate-y-0"
          }
          aria-label={decrementLabel}
        >
          <Minus />
        </Button>
        <span
          className="font-data w-8 text-center text-base font-semibold"
          aria-live="polite"
        >
          {value}
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon-lg"
          onClick={() => {
            if (canIncrement) onStep(1);
          }}
          aria-disabled={!canIncrement}
          className={
            canIncrement
              ? undefined
              : "opacity-50 shadow-none hover:translate-y-0 active:translate-y-0"
          }
          aria-label={incrementLabel}
        >
          <Plus />
        </Button>
      </div>
    </div>
  );
}

function PlayModeChoiceGroup({
  formats,
  selectedFormat,
  onFormatChange,
  disabled,
  label,
}: {
  formats: EventFormat[];
  selectedFormat: EventFormat;
  onFormatChange: (format: EventFormat) => void;
  disabled: boolean;
  label: string;
}) {
  return (
    <ToggleGroup
      type="single"
      value={formats.includes(selectedFormat) ? selectedFormat : ""}
      onValueChange={(value) => {
        if (value) onFormatChange(value as EventFormat);
      }}
      variant="outline"
      aria-label={label}
      className="grid gap-2 sm:grid-cols-2"
      disabled={disabled}
    >
      {formats.map((formatId) => {
        const definition = FORMAT_DEFINITIONS[formatId];
        const isRecommended = formatId === RECOMMENDED_FORMAT;
        const isSelected = selectedFormat === formatId;

        return (
          <ToggleGroupItem
            key={formatId}
            value={formatId}
            aria-label={`Use ${definition.name}${isRecommended ? ", most popular" : ""}`}
            className={cn(
              "h-auto min-h-[7.5rem] w-full flex-col items-start justify-start gap-2 whitespace-normal rounded-lg border border-border/70 bg-background/60 px-3 py-3 text-left transition-all hover:border-primary/45 hover:bg-background/85 data-[state=on]:border-primary data-[state=on]:bg-primary/10 data-[state=on]:shadow-sm",
              isRecommended &&
                "border-primary/60 bg-primary/5 shadow-[0_14px_35px_-28px_var(--primary)]",
              isSelected && "ring-1 ring-primary/20"
            )}
          >
            <span className="flex w-full items-start justify-between gap-2">
              <span className="font-semibold leading-tight">
                {definition.name}
              </span>
              {isRecommended && (
                <Badge className="shrink-0 text-[0.65rem]">Most popular</Badge>
              )}
            </span>
            <span className="block text-xs leading-snug text-muted-foreground">
              {PLAY_MODE_HELP_TEXT[formatId] ?? definition.description}
            </span>
            <span className="flex flex-wrap gap-1.5 pt-0.5">
              <Badge variant="outline" className="text-[0.65rem]">
                {definition.minPlayers}+ players
              </Badge>
              <Badge variant="outline" className="text-[0.65rem]">
                {getScoringLabel(formatId)}
              </Badge>
            </span>
          </ToggleGroupItem>
        );
      })}
    </ToggleGroup>
  );
}

export function EnhancedPlayerSetup({
  sessionName,
  onSessionNameChange,
  players,
  onPlayersChange,
  settings,
  onSettingsChange,
  onStartTournament,
  tournamentStarted,
  readOnly = false,
  checkIns = {},
}: EnhancedPlayerSetupProps) {
  const reduceMotion = useReducedMotion();
  const [wizardStep, setWizardStep] = useState<WizardStep>(1);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  // Autofocus opens the software keyboard on touch devices — only desktop gets it.
  const canAutoFocus = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(hover: hover) and (pointer: fine)").matches,
    []
  );
  const [stepDirection, setStepDirection] = useState(1);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPartnerName, setNewPartnerName] = useState("");
  const [bulkNames, setBulkNames] = useState("");
  const [showBulkEntry, setShowBulkEntry] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [showMorePlayModes, setShowMorePlayModes] = useState(false);
  const [showDuprLogin, setShowDuprLogin] = useState(false);
  const [addMode, setAddMode] = useState<"manual" | "dupr">("manual");
  const [expectedPlayerCount, setExpectedPlayerCount] = useState(() =>
    Math.max(4, players.length)
  );
  const [availableCourtCount, setAvailableCourtCount] = useState(() =>
    Math.min(MAX_SETUP_COURTS, Math.max(1, settings.numberOfCourts))
  );
  const [hasEditedCourtCount, setHasEditedCourtCount] = useState(false);

  const formatDefinition = FORMAT_DEFINITIONS[settings.format];
  const isFixedPartners = settings.partnerMode === "fixed";
  const sessionMode: SessionMode = isFixedPartners ? "fixed" : "rotating";
  const hasDuprConfig = !!DUPR_CONFIG.clientKey;
  const playerControlsDisabled = tournamentStarted || readOnly;
  const formatControlsDisabled = tournamentStarted || readOnly;
  const isWizard = !tournamentStarted && !readOnly;
  const fixedTeams = useMemo(() => getFixedTeams(players), [players]);
  const teamCount = Math.floor(players.length / 2);
  const minimumPlayers = formatDefinition?.minPlayers ?? 4;
  const visiblePlayModes = isFixedPartners
    ? FIXED_FORMATS
    : ROTATING_PRIMARY_FORMATS;
  const extraPlayModes = isFixedPartners ? [] : ROTATING_MORE_FORMATS;
  const showExtraPlayModes =
    showMorePlayModes || extraPlayModes.includes(settings.format);
  const selectedModeText = `${formatDefinition.name} / ${
    isFixedPartners ? "set teams" : "rotating partners"
  }`;
  const targetPlayerCount = Math.max(
    minimumPlayers,
    expectedPlayerCount,
    players.length
  );
  const minTargetPlayers = Math.max(minimumPlayers, players.length);
  const maxUsableCourts = getMaxUsableCourts(targetPlayerCount);
  const maxSelectableCourts = Math.min(MAX_SETUP_COURTS, maxUsableCourts);
  const selectedCourtCount = getCourtCountForPlayers(
    targetPlayerCount,
    availableCourtCount
  );
  const hasEnoughPlayers = players.length >= targetPlayerCount;
  const hasCompleteTeams = !isFixedPartners || players.length % 2 === 0;
  const canStart = hasEnoughPlayers && hasCompleteTeams;
  const gamesPerRound = isFixedPartners
    ? Math.min(selectedCourtCount, Math.floor(teamCount / 2))
    : Math.min(selectedCourtCount, Math.floor(players.length / 4));
  const playingThisRound = isFixedPartners
    ? gamesPerRound * 2
    : gamesPerRound * 4;
  const sittingOutThisRound = canStart
    ? Math.max(0, (isFixedPartners ? teamCount : players.length) - playingThisRound)
    : 0;
  const missingCount = Math.max(0, targetPlayerCount - players.length);
  const setupStatus = canStart
    ? `${pluralize(
        isFixedPartners ? teamCount : players.length,
        isFixedPartners ? "team" : "player"
      )} ready / ${pluralize(gamesPerRound || 1, "court")}`
    : isFixedPartners
    ? hasCompleteTeams
      ? `Add ${pluralize(missingCount, "more player", "more players")}`
      : "Finish the last team"
    : `Add ${pluralize(missingCount, "more player", "more players")}`;
  const unusedCourtCount = Math.max(0, availableCourtCount - selectedCourtCount);
  const unusedCourtText =
    unusedCourtCount > 0
      ? ` ${pluralize(unusedCourtCount, "court")} stays open.`
      : "";
  const courtPlanText = canStart
    ? `${playingThisRound} ${isFixedPartners ? "teams" : "players"} play each round${
        sittingOutThisRound > 0
          ? `, ${pluralize(sittingOutThisRound, isFixedPartners ? "team" : "player")} ${sittingOutThisRound === 1 ? "sits" : "sit"}`
          : ""
      }.${unusedCourtText}`
    : `${pluralize(selectedCourtCount, "court")} ready for ${pluralize(
        targetPlayerCount,
        "player"
      )}.${unusedCourtText}`;

  // Step 1 gates on the absolute minimum for a game; the format-specific
  // minimum is enforced by the review step's Generate CTA.
  const step1MissingCount = Math.max(0, STEP1_MIN_PLAYERS - players.length);
  const canLeaveStep1 = step1MissingCount === 0 && hasCompleteTeams;
  const step1Progress = Math.min(
    100,
    (players.length / STEP1_MIN_PLAYERS) * 100
  );
  const step1CtaLabel = canLeaveStep1
    ? "Next: pick a format"
    : step1MissingCount > 0
    ? `Add ${pluralize(step1MissingCount, "more player", "more players")}`
    : "Finish the last team";
  const liveCourtLine = `${pluralize(players.length, "player")} → ${pluralize(
    selectedCourtCount,
    "court"
  )}`;

  useEffect(() => {
    if (tournamentStarted || readOnly) return;
    if (settings.numberOfCourts === selectedCourtCount) return;

    onSettingsChange({
      ...settings,
      numberOfCourts: selectedCourtCount,
    });
  }, [
    onSettingsChange,
    readOnly,
    selectedCourtCount,
    settings,
    tournamentStarted,
  ]);

  const goToStep = (step: WizardStep) => {
    if (step === wizardStep) return;

    setStepDirection(step > wizardStep ? 1 : -1);
    setWizardStep(step);
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    // AnimatePresence unmounts the old step; keep focus on the persistent
    // heading so keyboard/SR users land on the new step announcement.
    requestAnimationFrame(() => {
      stepHeadingRef.current?.focus({ preventScroll: true });
    });
  };

  const updateCourtCount = (
    requestedCourts: number,
    nextTarget = targetPlayerCount
  ) => {
    onSettingsChange({
      ...settings,
      numberOfCourts: getCourtCountForPlayers(
        nextTarget,
        Math.min(MAX_SETUP_COURTS, requestedCourts)
      ),
    });
  };

  const updatePlayers = (nextPlayers: LocalPlayer[]) => {
    onPlayersChange(nextPlayers);

    if (!hasEditedCourtCount) {
      const nextTarget = Math.max(minimumPlayers, expectedPlayerCount, nextPlayers.length);
      const nextCourtCount = getMaxUsableCourts(nextTarget);

      setAvailableCourtCount(nextCourtCount);
      updateCourtCount(nextCourtCount, nextTarget);
    } else {
      const nextTarget = Math.max(minimumPlayers, expectedPlayerCount, nextPlayers.length);
      updateCourtCount(availableCourtCount, nextTarget);
    }
  };

  const adjustExpectedPlayers = (delta: number) => {
    const nextTarget = Math.max(minTargetPlayers, targetPlayerCount + delta);

    setExpectedPlayerCount(nextTarget);

    if (!hasEditedCourtCount) {
      const nextCourtCount = getMaxUsableCourts(nextTarget);

      setAvailableCourtCount(nextCourtCount);
      updateCourtCount(nextCourtCount, nextTarget);
      return;
    }

    updateCourtCount(availableCourtCount, nextTarget);
  };

  const adjustCourtCount = (delta: number) => {
    const nextCourtCount = Math.min(
      maxSelectableCourts,
      Math.max(1, selectedCourtCount + delta)
    );

    setHasEditedCourtCount(true);
    setAvailableCourtCount(nextCourtCount);
    updateCourtCount(nextCourtCount);
  };

  const handleModeChange = (value: string) => {
    if (!value || formatControlsDisabled) return;

    const nextFormat = value === "fixed" ? "shuffle" : "popcorn";
    const nextSettings = {
      ...preserveCommonSettings(
        createDefaultEventSettings(nextFormat),
        settings
      ),
      numberOfCourts: selectedCourtCount,
    };

    onSettingsChange(nextSettings);
    setAddMode("manual");
    setShowMorePlayModes(false);
    setShowBulkEntry(false);
    setBulkNames("");
  };

  const handleFormatChange = (format: EventFormat) => {
    const nextSettings = preserveCommonSettings(
      createDefaultEventSettings(format),
      settings
    );

    onSettingsChange({
      ...nextSettings,
      numberOfCourts: getCourtCountForPlayers(targetPlayerCount, nextSettings.numberOfCourts),
    });
    setAddMode("manual");
    setShowBulkEntry(false);
    setBulkNames("");
  };

  const handleAdvancedSettingsChange = (nextSettings: EventSettings) => {
    if (nextSettings.numberOfCourts !== settings.numberOfCourts) {
      const nextCourtCount = Math.min(
        MAX_SETUP_COURTS,
        nextSettings.numberOfCourts
      );

      setHasEditedCourtCount(true);
      setAvailableCourtCount(nextCourtCount);
    }

    onSettingsChange({
      ...nextSettings,
      numberOfCourts: getCourtCountForPlayers(
        targetPlayerCount,
        Math.min(MAX_SETUP_COURTS, nextSettings.numberOfCourts)
      ),
    });
  };

  const addPlayer = () => {
    const playerName = newPlayerName.trim();

    if (playerControlsDisabled || !playerName) return;

    updatePlayers([...players, buildLocalPlayer(playerName)]);
    setNewPlayerName("");
  };

  const addFixedTeam = () => {
    const playerName = newPlayerName.trim();
    const partnerName = newPartnerName.trim();

    if (playerControlsDisabled || !playerName || !partnerName) return;

    updatePlayers([
      ...players,
      buildLocalPlayer(playerName),
      buildLocalPlayer(partnerName),
    ]);
    setNewPlayerName("");
    setNewPartnerName("");
  };

  const addBulkEntries = () => {
    if (playerControlsDisabled || !bulkNames.trim()) return;

    if (isFixedPartners) {
      const teams = parseTeamRows(bulkNames);
      if (teams.length === 0) return;

      updatePlayers([
        ...players,
        ...teams.flatMap(([playerName, partnerName]) => [
          buildLocalPlayer(playerName),
          buildLocalPlayer(partnerName),
        ]),
      ]);
    } else {
      const names = splitPlayerNames(bulkNames);
      if (names.length === 0) return;

      updatePlayers([...players, ...names.map(buildLocalPlayer)]);
    }

    setBulkNames("");
    setShowBulkEntry(false);
  };

  const addDuprPlayer = (player: DuprPlayer) => {
    if (playerControlsDisabled) return;

    const exists = players.some(
      (p) =>
        p.duprId === player.duprId ||
        (player.duprId && (p as DuprPlayer).duprId === player.duprId)
    );
    if (exists) {
      alert("This player is already in the tournament.");
      return;
    }
    updatePlayers([...players, player as LocalPlayer]);
  };

  const addPlayerByDuprId = (duprId: string, rating?: number) => {
    if (playerControlsDisabled) return;

    const exists = players.some((p) => (p as DuprPlayer).duprId === duprId);
    if (exists) {
      alert("This DUPR ID is already in the tournament.");
      return;
    }

    const player: DuprPlayer = {
      id: generateId(),
      name: `DUPR #${duprId}`,
      duprId,
      duprRating: rating,
      rating,
      duprVerified: false,
    };
    updatePlayers([...players, player as LocalPlayer]);
  };

  const removePlayer = (id: string) => {
    if (playerControlsDisabled) return;

    updatePlayers(players.filter((player) => player.id !== id));
  };

  const removeTeam = (teamIndex: number) => {
    if (playerControlsDisabled) return;

    const firstPlayerIndex = teamIndex * 2;
    updatePlayers(
      players.filter(
        (_player, index) =>
          index !== firstPlayerIndex && index !== firstPlayerIndex + 1
      )
    );
  };

  const incompleteTeamAlert = isFixedPartners && !hasCompleteTeams && (
    <Alert variant="destructive">
      <Users />
      <AlertTitle>One player needs a partner</AlertTitle>
      <AlertDescription>
        Add one more name or remove the incomplete team.
      </AlertDescription>
    </Alert>
  );

  const stepVariants = {
    enter: (direction: number) => ({
      opacity: 0,
      x: reduceMotion ? 0 : direction * 24,
    }),
    center: { opacity: 1, x: 0 },
    exit: (direction: number) => ({
      opacity: 0,
      x: reduceMotion ? 0 : direction * -24,
    }),
  };

  const stepOne = (
    <>
      <Card>
        <CardContent className="flex flex-col gap-4">
          {hasDuprConfig && !isFixedPartners && (
            <div className="grid grid-cols-2 rounded-lg bg-muted/45 p-1">
              <Button
                type="button"
                variant={addMode === "manual" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setAddMode("manual")}
              >
                Manual
              </Button>
              <Button
                type="button"
                variant={addMode === "dupr" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setAddMode("dupr")}
              >
                DUPR
              </Button>
            </div>
          )}

          {addMode === "manual" && !isFixedPartners && (
            <form
              className="flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                addPlayer();
              }}
            >
              <Input
                placeholder="Player name"
                aria-label="Player name"
                value={newPlayerName}
                onChange={(event) => setNewPlayerName(event.target.value)}
                disabled={playerControlsDisabled}
                autoComplete="off"
                autoFocus={canAutoFocus && players.length === 0}
                className="h-12 text-base"
              />
              <Button
                type="submit"
                disabled={playerControlsDisabled || !newPlayerName.trim()}
                className="h-12 px-4"
              >
                <Plus data-icon="inline-start" />
                Add
              </Button>
            </form>
          )}

          {addMode === "manual" && isFixedPartners && (
            <form
              className="flex flex-col gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                addFixedTeam();
              }}
            >
              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  placeholder="Player 1"
                  aria-label="Player 1 name"
                  value={newPlayerName}
                  onChange={(event) => setNewPlayerName(event.target.value)}
                  disabled={playerControlsDisabled}
                  autoComplete="off"
                  autoFocus={canAutoFocus && players.length === 0}
                  className="h-12 text-base"
                />
                <Input
                  placeholder="Player 2"
                  aria-label="Player 2 name"
                  value={newPartnerName}
                  onChange={(event) => setNewPartnerName(event.target.value)}
                  disabled={playerControlsDisabled}
                  autoComplete="off"
                  className="h-12 text-base"
                />
              </div>
              <Button
                type="submit"
                disabled={
                  playerControlsDisabled ||
                  !newPlayerName.trim() ||
                  !newPartnerName.trim()
                }
                className="h-12"
              >
                <Plus data-icon="inline-start" />
                Add team
              </Button>
            </form>
          )}

          {addMode === "manual" && (
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-11 justify-between"
                onClick={() => setShowBulkEntry((value) => !value)}
              >
                <span className="inline-flex items-center gap-2">
                  <ClipboardList data-icon="inline-start" />
                  Paste many
                </span>
                <ChevronDown
                  className={cn(
                    "transition-transform",
                    showBulkEntry && "rotate-180"
                  )}
                />
              </Button>
              <AnimatePresence initial={false}>
                {showBulkEntry && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="flex flex-col gap-2 rounded-lg border border-border/70 bg-muted/30 p-2">
                      <Textarea
                        value={bulkNames}
                        onChange={(event) => setBulkNames(event.target.value)}
                        placeholder={
                          isFixedPartners
                            ? "Ana & Ben\nCara & Diego"
                            : "Ana\nBen\nCara\nDiego"
                        }
                        aria-label={
                          isFixedPartners
                            ? "Paste teams"
                            : "Paste player names"
                        }
                        className="min-h-28 text-base"
                      />
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Button
                          type="button"
                          onClick={addBulkEntries}
                          disabled={!bulkNames.trim()}
                          className="h-11 flex-1"
                        >
                          <UserPlus data-icon="inline-start" />
                          Add pasted names
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => {
                            setBulkNames("");
                            setShowBulkEntry(false);
                          }}
                          className="h-11 sm:w-28"
                        >
                          Clear
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {addMode === "dupr" && !isFixedPartners && (
            <div className="flex flex-col gap-4">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setShowDuprLogin(true)}
              >
                <LogIn data-icon="inline-start" />
                Login with DUPR
              </Button>
              <div className="flex items-center gap-3 text-xs uppercase text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                <span>Or add by DUPR ID</span>
                <span className="h-px flex-1 bg-border" />
              </div>
              <DuprIdInput
                onSubmit={addPlayerByDuprId}
                disabled={playerControlsDisabled}
              />
            </div>
          )}

          {players.length === 0 && (
            <div className="rounded-lg border border-border/70 bg-muted/25 p-3 text-sm text-muted-foreground">
              No names yet. Paste everyone at once for the fastest start.
            </div>
          )}

          {players.length > 0 && isFixedPartners && (
            <div className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="font-display text-sm font-semibold">
                  Teams added ({fixedTeams.length})
                </h3>
                <p className="text-xs text-muted-foreground" role="status">
                  {liveCourtLine}
                </p>
              </div>
              <div className="grid gap-2">
                {fixedTeams.map((team) => (
                  <TeamRow
                    key={team.player1.id}
                    team={team}
                    checkIns={checkIns}
                    onRemove={() => removeTeam(team.index)}
                  />
                ))}
              </div>
            </div>
          )}

          {players.length > 0 && !isFixedPartners && (
            <div className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="font-display text-sm font-semibold">
                  Players added ({players.length})
                </h3>
                <p className="text-xs text-muted-foreground" role="status">
                  {liveCourtLine}
                </p>
              </div>
              <ul className="flex flex-col gap-2">
                {players.map((player) => (
                  <li key={player.id}>
                    <PlayerRow
                      player={player}
                      checkIns={checkIns}
                      onRemove={() => removePlayer(player.id)}
                    />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {incompleteTeamAlert}
    </>
  );

  const stepTwo = (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <ToggleGroup
          type="single"
          value={sessionMode}
          onValueChange={handleModeChange}
          variant="outline"
          aria-label="Partner mode"
          className="grid w-full grid-cols-2 rounded-lg bg-muted/45 p-1"
        >
          <ToggleGroupItem
            value="rotating"
            aria-label="Use rotating partners"
            className="h-12 justify-center gap-2 rounded-md border-0 data-[state=on]:bg-background data-[state=on]:shadow-sm"
          >
            <UsersRound />
            <span className="font-semibold">Rotating partners</span>
          </ToggleGroupItem>
          <ToggleGroupItem
            value="fixed"
            aria-label="Use set teams"
            className="h-12 justify-center gap-2 rounded-md border-0 data-[state=on]:bg-background data-[state=on]:shadow-sm"
          >
            <Users />
            <span className="font-semibold">Set teams</span>
          </ToggleGroupItem>
        </ToggleGroup>

        <PlayModeChoiceGroup
          formats={visiblePlayModes}
          selectedFormat={settings.format}
          onFormatChange={handleFormatChange}
          disabled={formatControlsDisabled}
          label="Choose format"
        />

        {extraPlayModes.length > 0 && (
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              variant="ghost"
              className="h-11 justify-between px-2"
              onClick={() => setShowMorePlayModes((value) => !value)}
            >
              <span>
                {showExtraPlayModes ? "Hide extra formats" : "More formats"}
              </span>
              <ChevronDown
                className={cn(
                  "transition-transform",
                  showExtraPlayModes && "rotate-180"
                )}
              />
            </Button>
            <AnimatePresence initial={false}>
              {showExtraPlayModes && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <PlayModeChoiceGroup
                    formats={extraPlayModes}
                    selectedFormat={settings.format}
                    onFormatChange={handleFormatChange}
                    disabled={formatControlsDisabled}
                    label="Choose extra format"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const stepThree = (
    <>
      <Card>
        <CardContent className="flex flex-col gap-2">
          <SummaryRow
            icon={Trophy}
            label="Format"
            value={formatDefinition.name}
            caption={
              PLAY_MODE_HELP_TEXT[settings.format] ??
              formatDefinition.description
            }
          />
          <SummaryRow
            icon={isFixedPartners ? Users : UsersRound}
            label="Partners"
            value={isFixedPartners ? "Set teams" : "Rotating partners"}
          />
          <SummaryStepperRow
            icon={Users}
            label="Players"
            value={targetPlayerCount}
            caption={
              missingCount > 0
                ? `Start unlocks after ${pluralize(targetPlayerCount, "name")}.`
                : `${pluralize(players.length, "name")} added.`
            }
            onStep={adjustExpectedPlayers}
            canDecrement={targetPlayerCount > minTargetPlayers}
            canIncrement
            decrementLabel="Expect one fewer player"
            incrementLabel="Expect one more player"
          />
          <SummaryStepperRow
            icon={LayoutGrid}
            label="Courts"
            value={selectedCourtCount}
            caption={`Up to ${pluralize(maxSelectableCourts, "court")} for ${pluralize(
              targetPlayerCount,
              "player"
            )}.`}
            onStep={adjustCourtCount}
            canDecrement={selectedCourtCount > 1}
            canIncrement={selectedCourtCount < maxSelectableCourts}
            decrementLabel="Use one fewer court"
            incrementLabel="Use one more court"
          />
          <p className="px-1 text-xs text-muted-foreground" role="status">
            {courtPlanText}
          </p>
        </CardContent>
      </Card>

      {incompleteTeamAlert}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg">Advanced</CardTitle>
              <CardDescription>
                Defaults are ready. Change these only if you need to.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvancedSettings((value) => !value)}
            >
              <Settings2 data-icon="inline-start" />
              {showAdvancedSettings ? "Hide" : "Show"}
            </Button>
          </div>
        </CardHeader>
        <AnimatePresence initial={false}>
          {showAdvancedSettings && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium" htmlFor="session-name">
                    Session name
                  </label>
                  <Input
                    id="session-name"
                    value={sessionName}
                    onChange={(event) =>
                      onSessionNameChange(event.target.value)
                    }
                    disabled={readOnly}
                    className="h-11 text-base"
                  />
                </div>
                <FormatSettingsForm
                  format={settings.format}
                  settings={{
                    ...settings,
                    numberOfCourts: selectedCourtCount,
                  }}
                  onSettingsChange={handleAdvancedSettingsChange}
                  playerCount={targetPlayerCount}
                  disabled={tournamentStarted}
                />
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </>
  );

  if (!isWizard) {
    return (
      <div className="flex flex-col gap-3 sm:gap-4">
        {tournamentStarted && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Session in progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-2 flex items-center gap-2">
                <Badge variant="secondary">{formatDefinition.name}</Badge>
                <Badge variant="outline">
                  {isFixedPartners ? "Set teams" : "Rotating partners"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {players.length} players / {settings.numberOfCourts} court
                {settings.numberOfCourts !== 1 ? "s" : ""}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {readOnly
                  ? "Open Matches to follow live scores and round status."
                  : "Go to Matches to enter scores or add more rounds."}
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">
              {isFixedPartners
                ? `Teams (${fixedTeams.length})`
                : `Players (${players.length})`}
            </CardTitle>
            <CardDescription>
              {tournamentStarted
                ? "The roster is locked while the session runs."
                : "The organizer is still setting up this session."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {players.length === 0 && (
              <div className="rounded-lg border border-border/70 bg-muted/25 p-3 text-sm text-muted-foreground">
                No players added yet.
              </div>
            )}

            {isFixedPartners
              ? fixedTeams.map((team) => (
                  <TeamRow
                    key={team.player1.id}
                    team={team}
                    checkIns={checkIns}
                  />
                ))
              : players.map((player) => (
                  <PlayerRow
                    key={player.id}
                    player={player}
                    checkIns={checkIns}
                  />
                ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentStepTitle =
    WIZARD_STEPS.find((entry) => entry.step === wizardStep)?.title ?? "";

  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      <div className="flex items-center gap-1">
        {wizardStep > 1 && (
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            className="-ml-2 shrink-0"
            onClick={() => goToStep((wizardStep - 1) as WizardStep)}
            aria-label={`Back to step ${wizardStep - 1}: ${
              WIZARD_STEPS[wizardStep - 2].title
            }`}
          >
            <ChevronLeft />
          </Button>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Step {wizardStep} of 3
          </p>
          <h2
            ref={stepHeadingRef}
            tabIndex={-1}
            className="font-display truncate text-xl font-semibold tracking-tight outline-none"
          >
            {currentStepTitle}
          </h2>
        </div>
        <div
          className="flex shrink-0 items-center"
          role="group"
          aria-label="Setup steps"
        >
          {WIZARD_STEPS.map(({ step, title }) => {
            const isCompleted = step < wizardStep;
            const isCurrent = step === wizardStep;

            return (
              <button
                key={step}
                type="button"
                onClick={() => {
                  if (isCompleted) goToStep(step);
                }}
                disabled={!isCompleted}
                aria-label={
                  isCompleted
                    ? `Back to step ${step}: ${title}`
                    : `Step ${step}: ${title}`
                }
                aria-current={isCurrent ? "step" : undefined}
                className="touch-target -mx-0.5 flex size-11 items-center justify-center rounded-full disabled:cursor-default"
              >
                <span
                  className={cn(
                    "rounded-full transition-all",
                    isCurrent
                      ? "h-2 w-5 bg-primary"
                      : isCompleted
                      ? "size-2 bg-primary/60"
                      : "size-2 bg-border"
                  )}
                />
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false} custom={stepDirection}>
        <motion.div
          key={wizardStep}
          custom={stepDirection}
          variants={stepVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            duration: reduceMotion ? 0.12 : 0.2,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="flex flex-col gap-3 sm:gap-4"
        >
          {wizardStep === 1 && stepOne}
          {wizardStep === 2 && stepTwo}
          {wizardStep === 3 && stepThree}
        </motion.div>
      </AnimatePresence>

      <DuprLogin
        open={showDuprLogin}
        onClose={() => setShowDuprLogin(false)}
        onLoginSuccess={addDuprPlayer}
      />

      <Card className="sticky bottom-0 z-30 -mx-3 rounded-b-none border-x-0 border-b-0 bg-background/92 shadow-2xl shadow-background/40 backdrop-blur-xl sm:static sm:mx-0 sm:rounded-lg sm:border">
        <CardContent className="flex flex-col gap-3 p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:p-4">
          {wizardStep === 1 && (
            <>
              {!canLeaveStep1 && (
                <div>
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="font-medium text-muted-foreground">
                      You need at least {STEP1_MIN_PLAYERS} players
                    </span>
                    <span className="font-data font-semibold">
                      {players.length}/{STEP1_MIN_PLAYERS}
                    </span>
                  </div>
                  <Progress value={step1Progress} className="mt-2" />
                </div>
              )}
              <Button
                type="button"
                size="lg"
                onClick={() => goToStep(2)}
                disabled={!canLeaveStep1}
                className="h-13 w-full text-base"
              >
                {canLeaveStep1 ? (
                  <ArrowRight data-icon="inline-start" />
                ) : (
                  <UserPlus data-icon="inline-start" />
                )}
                {step1CtaLabel}
              </Button>
            </>
          )}

          {wizardStep === 2 && (
            <>
              <div className="flex items-center justify-between gap-3">
                <p className="min-w-0 truncate text-sm font-semibold">
                  {formatDefinition.name}
                </p>
                <Badge variant="secondary" className="shrink-0">
                  {isFixedPartners ? "Set teams" : "Rotating partners"}
                </Badge>
              </div>
              <Button
                type="button"
                size="lg"
                onClick={() => goToStep(3)}
                className="h-13 w-full text-base"
              >
                <ArrowRight data-icon="inline-start" />
                Next: review & start
              </Button>
            </>
          )}

          {wizardStep === 3 && (
            <>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {canStart ? selectedModeText : setupStatus}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {canStart ? courtPlanText : selectedModeText}
                  </p>
                </div>
                <Badge variant={canStart ? "default" : "secondary"}>
                  {players.length}/{targetPlayerCount} players
                </Badge>
              </div>
              <Button
                type="button"
                size="lg"
                onClick={onStartTournament}
                disabled={!canStart}
                className="h-13 w-full text-base"
                data-analytics-event="first_round_generate_clicked"
                data-analytics-location="setup_sticky_cta"
                data-analytics-format={settings.format}
                data-analytics-mode={sessionMode}
              >
                {canStart ? (
                  <Play data-icon="inline-start" />
                ) : (
                  <UserPlus data-icon="inline-start" />
                )}
                {canStart ? "Generate first round" : setupStatus}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
