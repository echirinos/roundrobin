"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  LogIn,
  Play,
  Plus,
  Settings2,
  Trash2,
  UserPlus,
  Users,
  UsersRound,
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

const MAX_SETUP_COURTS = 24;
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
const FIXED_FORMATS: EventFormat[] = ["shuffle", "bracket", "milp"];
const RECOMMENDED_FORMAT: EventFormat = "popcorn";

const PLAY_MODE_HELP_TEXT: Partial<Record<EventFormat, string>> = {
  popcorn: "Best default for casual groups. Shuffle and play.",
  gauntlet: "More competitive. Winners get harder games.",
  king_of_court: "Winners move up. Losers move down.",
  up_down_river: "Top 2 move up, bottom 2 move down.",
  round_robin: "Classic rotating partners.",
  scramble: "Small court groups with less movement.",
  mixed_madness: "Mixed doubles with balanced teams.",
  double_header: "Two games with the same partner.",
  cream_crop: "Sort by skill, then compete.",
  claim_throne: "Defend the top court.",
  shuffle: "Keep partners. Rotate opponents.",
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
    maxRounds: currentSettings.maxRounds,
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

function parsePositiveInteger(value: string, fallback: number): number {
  const parsed = Number.parseInt(value, 10);
  return Math.max(1, Number.isNaN(parsed) ? fallback : parsed);
}

function parseCourtCount(value: string, fallback: number): number {
  return Math.min(MAX_SETUP_COURTS, parsePositiveInteger(value, fallback));
}

function normalizeCountInput(value: string): string {
  return value.replace(/\D/g, "");
}

function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function SetupSection({
  step,
  title,
  description,
  children,
}: {
  step: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="gap-2 pb-3">
        <div className="flex items-start gap-3">
          <Badge variant="secondary" className="mt-0.5 shrink-0">
            {step}
          </Badge>
          <div className="min-w-0">
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">{children}</CardContent>
    </Card>
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
            aria-label={`Use ${definition.name}${isRecommended ? ", recommended" : ""}`}
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
                <Badge className="shrink-0 text-[0.65rem]">Recommended</Badge>
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
  const [expectedPlayerCountInput, setExpectedPlayerCountInput] = useState<
    string | null
  >(null);
  const [availableCourtCount, setAvailableCourtCount] = useState(() =>
    Math.min(MAX_SETUP_COURTS, Math.max(1, settings.numberOfCourts))
  );
  const [availableCourtCountInput, setAvailableCourtCountInput] = useState<
    string | null
  >(null);
  const [hasEditedCourtCount, setHasEditedCourtCount] = useState(false);
  const [focusedCountField, setFocusedCountField] = useState<
    "players" | "courts" | null
  >(null);

  const formatDefinition = FORMAT_DEFINITIONS[settings.format];
  const isFixedPartners = settings.partnerMode === "fixed";
  const sessionMode: SessionMode = isFixedPartners ? "fixed" : "rotating";
  const hasDuprConfig = !!DUPR_CONFIG.clientKey;
  const playerControlsDisabled = tournamentStarted || readOnly;
  const formatControlsDisabled = tournamentStarted || readOnly;
  const fixedTeams = useMemo(() => getFixedTeams(players), [players]);
  const teamCount = Math.floor(players.length / 2);
  const minimumPlayers = isFixedPartners ? 4 : formatDefinition?.minPlayers ?? 4;
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
  const maxUsableCourts = getMaxUsableCourts(targetPlayerCount);
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
  const progressCurrent = players.length;
  const progressRequired = targetPlayerCount;
  const setupProgress = Math.min(100, (progressCurrent / progressRequired) * 100);
  const missingCount = Math.max(0, progressRequired - progressCurrent);
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
  const expectedPlayerCountValue =
    focusedCountField === "players"
      ? expectedPlayerCountInput ?? targetPlayerCount.toString()
      : targetPlayerCount.toString();
  const availableCourtCountValue =
    focusedCountField === "courts"
      ? availableCourtCountInput ?? availableCourtCount.toString()
      : availableCourtCount.toString();

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

  const handleExpectedPlayerCountChange = (value: string) => {
    const nextValue = normalizeCountInput(value);

    setExpectedPlayerCountInput(nextValue);

    if (!nextValue) return;

    const nextExpectedCount = Math.max(
      minimumPlayers,
      parsePositiveInteger(nextValue, minimumPlayers)
    );
    const nextTarget = Math.max(nextExpectedCount, players.length);

    setExpectedPlayerCount(nextExpectedCount);

    if (!hasEditedCourtCount) {
      const nextCourtCount = getMaxUsableCourts(nextTarget);

      setAvailableCourtCount(nextCourtCount);
      updateCourtCount(nextCourtCount, nextTarget);
      return;
    }

    updateCourtCount(availableCourtCount, nextTarget);
  };

  const commitExpectedPlayerCount = () => {
    const inputValue = expectedPlayerCountInput;

    setFocusedCountField(null);
    setExpectedPlayerCountInput(null);

    if (!inputValue) return;

    handleExpectedPlayerCountChange(inputValue);
  };

  const handleCourtCountChange = (value: string) => {
    const nextValue = normalizeCountInput(value);

    setAvailableCourtCountInput(nextValue);

    if (!nextValue) return;

    const nextCourtCount = parseCourtCount(nextValue, availableCourtCount);

    setHasEditedCourtCount(true);
    setAvailableCourtCount(nextCourtCount);
    updateCourtCount(nextCourtCount);
  };

  const commitCourtCount = () => {
    const inputValue = availableCourtCountInput;

    setFocusedCountField(null);
    setAvailableCourtCountInput(null);

    if (!inputValue) return;

    handleCourtCountChange(inputValue);
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

  return (
    <div className="flex flex-col gap-3 pb-24 sm:gap-4 sm:pb-0">
      {!tournamentStarted && !readOnly && (
        <SetupSection
          step="1"
          title="Choose game mode"
          description="Use Popcorn unless you already know you want something competitive."
        >
          <ToggleGroup
            type="single"
            value={sessionMode}
            onValueChange={handleModeChange}
            variant="outline"
            size="lg"
            className="grid w-full grid-cols-2 rounded-lg bg-muted/45 p-1"
          >
            <ToggleGroupItem
              value="rotating"
              aria-label="Use rotating partners"
              className="h-auto min-h-20 flex-col items-start justify-center gap-1 whitespace-normal rounded-md border-0 px-3 py-3 text-left data-[state=on]:bg-background data-[state=on]:shadow-sm"
            >
              <UsersRound />
              <span className="font-semibold">Round robin</span>
              <span className="text-xs text-muted-foreground">
                Rotate partners
              </span>
            </ToggleGroupItem>
            <ToggleGroupItem
              value="fixed"
              aria-label="Use set teams"
              className="h-auto min-h-20 flex-col items-start justify-center gap-1 whitespace-normal rounded-md border-0 px-3 py-3 text-left data-[state=on]:bg-background data-[state=on]:shadow-sm"
            >
              <Users />
              <span className="font-semibold">Set teams</span>
              <span className="text-xs text-muted-foreground">
                Keep partners
              </span>
            </ToggleGroupItem>
          </ToggleGroup>

          <div className="flex flex-col gap-3 rounded-lg border border-border/70 bg-background/55 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-display text-sm font-semibold">
                  Play mode
                </h3>
                <p className="text-xs text-muted-foreground">
                  {selectedModeText}
                </p>
              </div>
              <Badge variant="outline">{formatDefinition.shortName}</Badge>
            </div>

            <PlayModeChoiceGroup
              formats={visiblePlayModes}
              selectedFormat={settings.format}
              onFormatChange={handleFormatChange}
              disabled={formatControlsDisabled}
              label="Choose play mode"
            />

            {extraPlayModes.length > 0 && (
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="h-10 justify-between px-2"
                  onClick={() => setShowMorePlayModes((value) => !value)}
                >
                  <span>
                    {showExtraPlayModes ? "Hide extra modes" : "More play modes"}
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
                        label="Choose extra play mode"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </SetupSection>
      )}

      {!tournamentStarted && !readOnly && (
        <SetupSection
          step="2"
          title="Tell us what you have"
          description="Set the group size and courts before adding names."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium" htmlFor="expected-players">
                Players here
              </label>
              <Input
                id="expected-players"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={expectedPlayerCountValue}
                onChange={(event) =>
                  handleExpectedPlayerCountChange(event.target.value)
                }
                onFocus={() => {
                  setFocusedCountField("players");
                  setExpectedPlayerCountInput(targetPlayerCount.toString());
                }}
                onBlur={commitExpectedPlayerCount}
                className="h-12 text-base font-semibold"
              />
              <p className="text-xs text-muted-foreground">
                Start unlocks after {pluralize(targetPlayerCount, "name")}.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium" htmlFor="available-courts">
                Courts available
              </label>
              <Input
                id="available-courts"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={availableCourtCountValue}
                onChange={(event) => handleCourtCountChange(event.target.value)}
                onFocus={() => {
                  setFocusedCountField("courts");
                  setAvailableCourtCountInput(availableCourtCount.toString());
                }}
                onBlur={commitCourtCount}
                className="h-12 text-base font-semibold"
              />
              <p className="text-xs text-muted-foreground">
                {availableCourtCount > maxUsableCourts
                  ? `${pluralize(maxUsableCourts, "court")} can be used with this group.`
                  : `${pluralize(selectedCourtCount, "court")} will be in play.`}
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-border/70 bg-background/55 p-3">
            <div className="mb-2 flex items-center justify-between gap-3 text-sm">
              <span className="font-medium text-muted-foreground">
                {setupStatus}
              </span>
              <span className="font-data font-semibold">
                {progressCurrent}/{progressRequired}
              </span>
            </div>
            <Progress value={setupProgress} />
            <p className="mt-2 text-xs text-muted-foreground">{courtPlanText}</p>
          </div>
        </SetupSection>
      )}

      <SetupSection
        step="3"
        title={isFixedPartners ? "Add teams" : "Add players"}
        description={
          isFixedPartners
            ? "Paste pairs or add one team at a time."
            : "Paste the full group or add one player at a time."
        }
      >
        {hasDuprConfig && !playerControlsDisabled && !isFixedPartners && (
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
              value={newPlayerName}
              onChange={(event) => setNewPlayerName(event.target.value)}
              disabled={playerControlsDisabled}
              autoComplete="off"
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
                value={newPlayerName}
                onChange={(event) => setNewPlayerName(event.target.value)}
                disabled={playerControlsDisabled}
                autoComplete="off"
                className="h-12 text-base"
              />
              <Input
                placeholder="Player 2"
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

        {addMode === "manual" && !playerControlsDisabled && (
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

        {addMode === "dupr" && !playerControlsDisabled && !isFixedPartners && (
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
            <div>
              <h3 className="font-display text-sm font-semibold">
                Teams added ({fixedTeams.length})
              </h3>
              <p className="text-xs text-muted-foreground">
                Each row becomes one team for the first round.
              </p>
            </div>
            <div className="grid gap-2">
              {fixedTeams.map((team) => (
                <div
                  key={team.player1.id}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-lg border bg-background/60 p-3",
                    !team.player2 && "border-destructive/50 bg-destructive/10"
                  )}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">Team {team.index + 1}</Badge>
                      {team.player2 ? (
                        team.player1.id in checkIns &&
                        team.player2.id in checkIns && (
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
                  {!playerControlsDisabled && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeTeam(team.index)}
                      aria-label={`Remove team ${team.index + 1}`}
                    >
                      <Trash2 />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {players.length > 0 && !isFixedPartners && (
          <div className="flex flex-col gap-2">
            <div>
              <h3 className="font-display text-sm font-semibold">
                Players added ({players.length})
              </h3>
              <p className="text-xs text-muted-foreground">
                Target: {pluralize(targetPlayerCount, "player")}. Courts update
                automatically when you paste the full group.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {players.map((player) => {
                const duprPlayer = player as DuprPlayer;
                const hasDupr = !!duprPlayer.duprId || !!duprPlayer.duprRating;

                if (hasDupr) {
                  return (
                    <DuprPlayerCard
                      key={player.id}
                      player={duprPlayer}
                      onRemove={
                        !playerControlsDisabled
                          ? () => removePlayer(player.id)
                          : undefined
                      }
                      compact
                    />
                  );
                }

                return (
                  <Badge
                    key={player.id}
                    variant={checkIns[player.id] ? "default" : "secondary"}
                    className="gap-2 px-3 py-2 text-sm"
                  >
                    {checkIns[player.id] && <CheckCircle2 className="size-3" />}
                    {player.name}
                    {!playerControlsDisabled && (
                      <button
                        type="button"
                        onClick={() => removePlayer(player.id)}
                        className="leading-none hover:text-destructive"
                        aria-label={`Remove ${player.name}`}
                      >
                        x
                      </button>
                    )}
                  </Badge>
                );
              })}
            </div>
          </div>
        )}
      </SetupSection>

      {isFixedPartners && !hasCompleteTeams && (
        <Alert variant="destructive">
          <Users />
          <AlertTitle>One player needs a partner</AlertTitle>
          <AlertDescription>
            Add one more name or remove the incomplete team.
          </AlertDescription>
        </Alert>
      )}

      <DuprLogin
        open={showDuprLogin}
        onClose={() => setShowDuprLogin(false)}
        onLoginSuccess={addDuprPlayer}
      />

      {!tournamentStarted && !readOnly && (
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
            {showAdvancedSettings ? (
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
                  <div className="rounded-lg border border-border/70 bg-background/55 p-3">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <h3 className="font-display text-sm font-semibold">
                          Format
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {formatDefinition.description}
                        </p>
                      </div>
                      <Badge variant="outline">{formatDefinition.shortName}</Badge>
                    </div>
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
            ) : (
              <CardContent>
                <div className="rounded-lg border border-border/70 bg-background/55 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-display text-sm font-semibold">
                        {formatDefinition.name}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {formatDefinition.description}
                      </p>
                    </div>
                    <Badge variant="outline">{formatDefinition.shortName}</Badge>
                  </div>
                </div>
              </CardContent>
            )}
          </AnimatePresence>
        </Card>
      )}

      {tournamentStarted && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Session in progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-2 flex items-center gap-2">
              <Badge variant="secondary">{formatDefinition.name}</Badge>
              <Badge variant="outline">
                {isFixedPartners ? "Set teams" : "Round robin"}
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

      {!tournamentStarted && !readOnly && (
        <Card className="sticky bottom-0 z-30 -mx-3 rounded-b-none border-x-0 border-b-0 bg-background/92 shadow-2xl shadow-background/40 backdrop-blur-xl sm:static sm:mx-0 sm:rounded-lg sm:border">
          <CardContent className="flex flex-col gap-3 p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">
                  4. Review and start
                </p>
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
            >
              {canStart ? (
                <Play data-icon="inline-start" />
              ) : (
                <UserPlus data-icon="inline-start" />
              )}
              {canStart ? "Generate first round" : setupStatus}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
