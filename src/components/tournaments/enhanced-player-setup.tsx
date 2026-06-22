"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  LogIn,
  Plus,
  Trash2,
  Users,
  UsersRound,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import type { LocalPlayer } from "@/src/types/database";
import type { EventFormat, EventSettings } from "@/src/types/formats";
import {
  FORMAT_DEFINITIONS,
  createDefaultEventSettings,
  isRotatingFormat,
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
  const [showFormatSelector, setShowFormatSelector] = useState(false);
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
  const teamCount = Math.floor(players.length / 2);
  const minimumPlayers = isFixedPartners ? 4 : formatDefinition?.minPlayers ?? 4;
  const hasEnoughPlayers = players.length >= minimumPlayers;
  const hasCompleteTeams = !isFixedPartners || players.length % 2 === 0;
  const canStart = hasEnoughPlayers && hasCompleteTeams;
  const gamesPerRound = isFixedPartners
    ? Math.min(settings.numberOfCourts, Math.floor(teamCount / 2))
    : Math.min(settings.numberOfCourts, Math.floor(players.length / 4));
  const fixedTeamsPlaying = Math.min(
    teamCount - (teamCount % 2),
    settings.numberOfCourts * 2
  );
  const playersOnBye = isFixedPartners
    ? Math.max(0, teamCount - fixedTeamsPlaying)
    : Math.max(0, players.length - settings.numberOfCourts * 4);

  const handleModeChange = (value: string) => {
    if (!value || formatControlsDisabled) return;

    const nextFormat = value === "fixed" ? "shuffle" : "round_robin";
    const nextSettings = preserveCommonSettings(
      createDefaultEventSettings(nextFormat),
      settings
    );

    onSettingsChange(nextSettings);
    setShowFormatSelector(false);
  };

  const addPlayer = () => {
    if (playerControlsDisabled || !newPlayerName.trim()) return;

    onPlayersChange([
      ...players,
      { id: generateId(), name: newPlayerName.trim() },
    ]);
    setNewPlayerName("");
  };

  const addFixedTeam = () => {
    const playerName = newPlayerName.trim();
    const partnerName = newPartnerName.trim();

    if (playerControlsDisabled || !playerName || !partnerName) return;

    onPlayersChange([
      ...players,
      { id: generateId(), name: playerName },
      { id: generateId(), name: partnerName },
    ]);
    setNewPlayerName("");
    setNewPartnerName("");
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
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Session</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="session-name">
              Session name
            </label>
            <Input
              id="session-name"
              value={sessionName}
              onChange={(event) => onSessionNameChange(event.target.value)}
              disabled={readOnly}
              className="h-11 text-base"
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium">Session type</span>
              {tournamentStarted && (
                <Badge variant="outline">
                  {isFixedPartners ? "Set partners" : "Rotating"}
                </Badge>
              )}
            </div>
            {!tournamentStarted && !readOnly ? (
              <ToggleGroup
                type="single"
                value={sessionMode}
                onValueChange={handleModeChange}
                variant="outline"
                size="lg"
                className="grid w-full grid-cols-2"
              >
                <ToggleGroupItem
                  value="rotating"
                  aria-label="Use rotating partners"
                  className="h-auto min-h-16 flex-col items-start justify-center whitespace-normal px-3 py-3 text-left"
                >
                  <UsersRound />
                  <span className="font-semibold">Rotating</span>
                  <span className="text-xs text-muted-foreground">
                    New partners each round
                  </span>
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="fixed"
                  aria-label="Use set partners"
                  className="h-auto min-h-16 flex-col items-start justify-center whitespace-normal px-3 py-3 text-left"
                >
                  <Users />
                  <span className="font-semibold">Set partners</span>
                  <span className="text-xs text-muted-foreground">
                    Teams stay together
                  </span>
                </ToggleGroupItem>
              </ToggleGroup>
            ) : (
              <p className="text-sm text-muted-foreground">
                {isFixedPartners
                  ? "Teams stay together and rotate opponents."
                  : "Players rotate partners and opponents across rounds."}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-lg">
              {isFixedPartners ? "Add Teams" : "Add Players"}
            </CardTitle>
            {hasDuprConfig && !playerControlsDisabled && !isFixedPartners && (
              <div className="flex gap-1">
                <Button
                  variant={addMode === "manual" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAddMode("manual")}
                >
                  Manual
                </Button>
                <Button
                  variant={addMode === "dupr" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAddMode("dupr")}
                >
                  DUPR
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {addMode === "manual" && !isFixedPartners && (
            <div className="flex gap-2">
              <Input
                placeholder="Player name"
                value={newPlayerName}
                onChange={(event) => setNewPlayerName(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && addPlayer()}
                disabled={playerControlsDisabled}
                className="h-11 text-base"
              />
              <Button onClick={addPlayer} disabled={playerControlsDisabled}>
                <Plus data-icon="inline-start" />
                Add
              </Button>
            </div>
          )}

          {addMode === "manual" && isFixedPartners && (
            <div className="flex flex-col gap-2">
              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  placeholder="Player 1"
                  value={newPlayerName}
                  onChange={(event) => setNewPlayerName(event.target.value)}
                  disabled={playerControlsDisabled}
                  className="h-11 text-base"
                />
                <Input
                  placeholder="Player 2"
                  value={newPartnerName}
                  onChange={(event) => setNewPartnerName(event.target.value)}
                  onKeyDown={(event) =>
                    event.key === "Enter" && addFixedTeam()
                  }
                  disabled={playerControlsDisabled}
                  className="h-11 text-base"
                />
              </div>
              <Button
                onClick={addFixedTeam}
                disabled={
                  playerControlsDisabled ||
                  !newPlayerName.trim() ||
                  !newPartnerName.trim()
                }
                className="h-11"
              >
                <Plus data-icon="inline-start" />
                Add Team
              </Button>
            </div>
          )}

          {addMode === "dupr" && !playerControlsDisabled && !isFixedPartners && (
            <div className="flex flex-col gap-4">
              <Button
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

          {players.length > 0 && isFixedPartners && (
            <div className="flex flex-col gap-2">
              <h4 className="text-sm font-medium">
                Teams ({fixedTeams.length})
              </h4>
              <div className="grid gap-2">
                {fixedTeams.map((team) => (
                  <div
                    key={team.player1.id}
                    className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 p-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
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
              <h4 className="text-sm font-medium">
                Players ({players.length})
              </h4>
              <div className="flex flex-wrap gap-2">
                {players.map((player) => {
                  const duprPlayer = player as DuprPlayer;
                  const hasDupr =
                    !!duprPlayer.duprId || !!duprPlayer.duprRating;

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
                      {checkIns[player.id] && (
                        <CheckCircle2 className="size-3" />
                      )}
                      {player.name}
                      {!playerControlsDisabled && (
                        <button
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

          {players.length > 0 && !hasEnoughPlayers && (
            <p className="text-sm text-muted-foreground">
              Need at least {minimumPlayers} players for{" "}
              {formatDefinition?.name ?? "this format"}.
            </p>
          )}

          {isFixedPartners && !hasCompleteTeams && (
            <Alert variant="destructive">
              <Users />
              <AlertTitle>One player needs a partner</AlertTitle>
              <AlertDescription>
                Set-partner sessions need complete two-player teams before
                rounds can be generated.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <DuprLogin
        open={showDuprLogin}
        onClose={() => setShowDuprLogin(false)}
        onLoginSuccess={addDuprPlayer}
      />

      {!tournamentStarted && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-lg">Round Format</CardTitle>
              {!readOnly && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFormatSelector(!showFormatSelector)}
                >
                  {showFormatSelector ? "Hide" : "Change"}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {showFormatSelector && !readOnly ? (
              <FormatSelector
                selectedFormat={settings.format}
                onFormatChange={handleFormatChange}
                disabled={tournamentStarted}
              />
            ) : (
              <FormatInfo format={settings.format} showRules />
            )}
          </CardContent>
        </Card>
      )}

      {!tournamentStarted && canStart && !readOnly && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3 px-1">
            <h2 className="text-lg font-semibold">Settings</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
            >
              {showAdvancedSettings ? "Hide" : "Show"}
            </Button>
          </div>
          {showAdvancedSettings ? (
            <FormatSettingsForm
              format={settings.format}
              settings={settings}
              onSettingsChange={onSettingsChange}
              playerCount={players.length}
              disabled={tournamentStarted}
            />
          ) : (
            <Card>
              <CardContent>
              <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                <p>
                  Courts: {settings.numberOfCourts} • Games/Round:{" "}
                  {settings.gamesPerRound}
                </p>
                <p>
                  Play to {settings.pointsToWin}, win by {settings.winBy}
                </p>
              </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {canStart && !tournamentStarted && !readOnly && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">
              Start {isFixedPartners ? "Set Partners" : formatDefinition.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex flex-col gap-2">
              <p className="text-sm text-muted-foreground">
                {isFixedPartners
                  ? `${teamCount} teams`
                  : `${players.length} players`}{" "}
                • {gamesPerRound} game{gamesPerRound !== 1 ? "s" : ""} per
                round
                {settings.numberOfCourts > 1 &&
                  ` • ${settings.numberOfCourts} courts`}
              </p>
              {playersOnBye > 0 && (
                <p className="text-sm text-muted-foreground">
                  {playersOnBye} {isFixedPartners ? "team" : "player"}
                  {playersOnBye !== 1 ? "s" : ""} will sit out each round.
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                {isRotatingFormat(settings.format)
                  ? "Partners rotate each round so everyone gets mixed in."
                  : "Teams stay together while opponents rotate each round."}
              </p>
            </div>
            <Button onClick={onStartTournament} size="lg" className="w-full">
              Generate First Round
            </Button>
          </CardContent>
        </Card>
      )}

      {tournamentStarted && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Session In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-2 flex items-center gap-2">
              <Badge variant="secondary">{formatDefinition.name}</Badge>
              <Badge variant="outline">
                {isFixedPartners ? "Set partners" : "Rotating"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {players.length} players • {settings.numberOfCourts} court
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
    </div>
  );
}
