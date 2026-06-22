"use client";

import { useMemo, useState } from "react";
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
import { FormatSelector, FormatInfo } from "./format-selector";
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
  const [showDuprLogin, setShowDuprLogin] = useState(false);
  const [addMode, setAddMode] = useState<"manual" | "dupr">("manual");

  const formatDefinition = FORMAT_DEFINITIONS[settings.format];
  const isFixedPartners = settings.partnerMode === "fixed";
  const sessionMode: SessionMode = isFixedPartners ? "fixed" : "rotating";
  const hasDuprConfig = !!DUPR_CONFIG.clientKey;
  const playerControlsDisabled = tournamentStarted || readOnly;
  const formatControlsDisabled = tournamentStarted || readOnly;
  const fixedTeams = useMemo(() => getFixedTeams(players), [players]);
  const completeTeamCount = fixedTeams.filter((team) => team.player2).length;
  const teamCount = Math.floor(players.length / 2);
  const minimumPlayers = isFixedPartners ? 4 : formatDefinition?.minPlayers ?? 4;
  const minimumTeams = Math.ceil(minimumPlayers / 2);
  const hasEnoughPlayers = players.length >= minimumPlayers;
  const hasCompleteTeams = !isFixedPartners || players.length % 2 === 0;
  const canStart = hasEnoughPlayers && hasCompleteTeams;
  const gamesPerRound = isFixedPartners
    ? Math.min(settings.numberOfCourts, Math.floor(teamCount / 2))
    : Math.min(settings.numberOfCourts, Math.floor(players.length / 4));
  const progressCurrent = isFixedPartners ? completeTeamCount : players.length;
  const progressRequired = isFixedPartners ? minimumTeams : minimumPlayers;
  const setupProgress = Math.min(100, (progressCurrent / progressRequired) * 100);
  const missingCount = Math.max(0, progressRequired - progressCurrent);
  const setupStatus = canStart
    ? `${isFixedPartners ? teamCount : players.length} ${
        isFixedPartners ? "teams" : "players"
      } ready / ${gamesPerRound || 1} game${gamesPerRound === 1 ? "" : "s"} per round`
    : isFixedPartners
    ? hasCompleteTeams
      ? `Add ${missingCount} more team${missingCount === 1 ? "" : "s"}`
      : "Finish the last team"
    : `Add ${missingCount} more player${missingCount === 1 ? "" : "s"}`;

  const handleModeChange = (value: string) => {
    if (!value || formatControlsDisabled) return;

    const nextFormat = value === "fixed" ? "shuffle" : "popcorn";
    const nextSettings = preserveCommonSettings(
      createDefaultEventSettings(nextFormat),
      settings
    );

    onSettingsChange(nextSettings);
    setAddMode("manual");
    setShowBulkEntry(false);
    setBulkNames("");
  };

  const addPlayer = () => {
    const playerName = newPlayerName.trim();

    if (playerControlsDisabled || !playerName) return;

    onPlayersChange([...players, buildLocalPlayer(playerName)]);
    setNewPlayerName("");
  };

  const addFixedTeam = () => {
    const playerName = newPlayerName.trim();
    const partnerName = newPartnerName.trim();

    if (playerControlsDisabled || !playerName || !partnerName) return;

    onPlayersChange([
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

      onPlayersChange([
        ...players,
        ...teams.flatMap(([playerName, partnerName]) => [
          buildLocalPlayer(playerName),
          buildLocalPlayer(partnerName),
        ]),
      ]);
    } else {
      const names = splitPlayerNames(bulkNames);
      if (names.length === 0) return;

      onPlayersChange([...players, ...names.map(buildLocalPlayer)]);
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
    onPlayersChange([...players, player as LocalPlayer]);
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
    onPlayersChange([...players, player as LocalPlayer]);
  };

  const removePlayer = (id: string) => {
    if (playerControlsDisabled) return;

    onPlayersChange(players.filter((player) => player.id !== id));
  };

  const removeTeam = (teamIndex: number) => {
    if (playerControlsDisabled) return;

    const firstPlayerIndex = teamIndex * 2;
    onPlayersChange(
      players.filter(
        (_player, index) =>
          index !== firstPlayerIndex && index !== firstPlayerIndex + 1
      )
    );
  };

  const handleFormatChange = (format: EventFormat) => {
    onSettingsChange(
      preserveCommonSettings(createDefaultEventSettings(format), settings)
    );
  };

  return (
    <div className="flex flex-col gap-4 pb-24 sm:pb-0">
      <Card className="overflow-hidden">
        <CardHeader className="gap-3 pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>Get playing</CardTitle>
              <CardDescription>
                Add names, keep the defaults, generate the first round.
              </CardDescription>
            </div>
            <Badge variant={canStart ? "default" : "secondary"}>
              {canStart ? "Ready" : `${Math.round(setupProgress)}%`}
            </Badge>
          </div>
          {!tournamentStarted && !readOnly && (
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
                aria-label="Use set partners"
                className="h-auto min-h-20 flex-col items-start justify-center gap-1 whitespace-normal rounded-md border-0 px-3 py-3 text-left data-[state=on]:bg-background data-[state=on]:shadow-sm"
              >
                <Users />
                <span className="font-semibold">Set teams</span>
                <span className="text-xs text-muted-foreground">
                  Keep partners
                </span>
              </ToggleGroupItem>
            </ToggleGroup>
          )}
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
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
          </div>

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
        </CardContent>
      </Card>

      {players.length > 0 && isFixedPartners && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Teams ({fixedTeams.length})</CardTitle>
            <CardDescription>
              Each row becomes one team for the first round.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
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
          </CardContent>
        </Card>
      )}

      {players.length > 0 && !isFixedPartners && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Players ({players.length})</CardTitle>
            <CardDescription>
              Four players is enough to generate the first court.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
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
          </CardContent>
        </Card>
      )}

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
                    <FormatSelector
                      selectedFormat={settings.format}
                      onFormatChange={handleFormatChange}
                      disabled={tournamentStarted}
                    />
                  </div>
                  <FormatSettingsForm
                    format={settings.format}
                    settings={settings}
                    onSettingsChange={onSettingsChange}
                    playerCount={players.length}
                    disabled={tournamentStarted}
                  />
                </CardContent>
              </motion.div>
            ) : (
              <CardContent>
                <FormatInfo format={settings.format} showRules={false} />
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
                <p className="truncate text-sm font-semibold">
                  {canStart ? "Ready for round 1" : setupStatus}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {isFixedPartners
                    ? "Set teams / opponents rotate"
                    : "Round robin / partners rotate"}
                </p>
              </div>
              <Badge variant={canStart ? "default" : "secondary"}>
                {isFixedPartners
                  ? `${completeTeamCount}/${minimumTeams} teams`
                  : `${players.length}/${minimumPlayers} players`}
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
