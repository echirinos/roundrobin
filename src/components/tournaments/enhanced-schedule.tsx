"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { LocalPlayer, LocalRoundGame, LocalStanding } from "@/src/types/database";
import type { EventSettings } from "@/src/types/formats";
import { RoundGameScoreEntry, RoundGamesList } from "@/src/components/scoring/round-game-score-entry";
import { FormatSummaryCard, RoundManager } from "./round-manager";
import { getDefaultCourtWeights } from "@/src/lib/formats/scoring";
import { Eye } from "lucide-react";

// Explicit allowlist of formats whose generators really move players between
// courts by results. Deriving this from seedingMethod is wrong on both edges:
// cream_crop's early sorting rounds are random, and formats without a wired
// generator (e.g. swiss) fall back to random matchups.
const MOVEMENT_FORMATS = new Set([
  "gauntlet",
  "team_gauntlet",
  "king_of_court",
  "up_down_river",
  "claim_throne",
]);

interface EnhancedScheduleProps {
  games: LocalRoundGame[];
  players: LocalPlayer[];
  standings: LocalStanding[];
  settings: EventSettings;
  currentRound: number;
  onUpdateGame: (gameId: string, team1Score: number, team2Score: number) => void;
  onAddRound: (newGames: LocalRoundGame[]) => void;
  onRemoveRound?: (roundNumber: number) => void;
  readOnly?: boolean;
}

export function EnhancedSchedule({
  games,
  players,
  standings,
  settings,
  currentRound,
  onUpdateGame,
  onAddRound,
  onRemoveRound,
  readOnly = false,
}: EnhancedScheduleProps) {
  const [selectedGame, setSelectedGame] = useState<LocalRoundGame | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Get court weights for display
  const courtWeights = useMemo(
    () => (settings.scoringType === "court_weighted"
      ? getDefaultCourtWeights(settings.numberOfCourts)
      : undefined),
    [settings.scoringType, settings.numberOfCourts]
  );

  // Group games by round
  const gamesByRound = useMemo(() => {
    return games.reduce((acc, game) => {
      if (!acc[game.round]) acc[game.round] = [];
      acc[game.round].push(game);
      return acc;
    }, {} as Record<number, LocalRoundGame[]>);
  }, [games]);

  const rounds = Object.keys(gamesByRound)
    .map(Number)
    .sort((a, b) => b - a); // Descending order (newest first)

  const isMovementFormat = MOVEMENT_FORMATS.has(settings.format);

  // playerId -> court per round, so round N can show movement vs round N-1.
  const courtsByRound = useMemo(() => {
    const byRound = new Map<number, Map<string, number>>();
    if (!isMovementFormat) return byRound;

    for (const game of games) {
      let courts = byRound.get(game.round);
      if (!courts) {
        courts = new Map<string, number>();
        byRound.set(game.round, courts);
      }
      for (const player of [...game.team1, ...game.team2]) {
        courts.set(player.id, game.courtNumber);
      }
    }
    return byRound;
  }, [games, isMovementFormat]);

  // First round each player actually appears in a game. A late arrival added
  // mid-session only "debuts" at the round they first play (or never, if still
  // waiting for a partner), so we never mislabel them as having sat out rounds
  // that happened before they joined.
  const debutRoundByPlayer = useMemo(() => {
    const debut = new Map<string, number>();
    for (const game of games) {
      for (const player of [...game.team1, ...game.team2]) {
        const current = debut.get(player.id);
        if (current === undefined || game.round < current) {
          debut.set(player.id, game.round);
        }
      }
    }
    return debut;
  }, [games]);

  // Get bye players for each round
  const getByePlayersForRound = (roundNumber: number): LocalPlayer[] => {
    const roundGames = gamesByRound[roundNumber] || [];
    const playingIds = new Set<string>();

    roundGames.forEach((game) => {
      game.team1.forEach((p) => playingIds.add(p.id));
      game.team2.forEach((p) => playingIds.add(p.id));
    });

    return players.filter((p) => {
      if (playingIds.has(p.id)) return false;
      // Only count as "sitting out" once they've entered the session — a player
      // who hasn't debuted by this round wasn't around to sit it out.
      const debut = debutRoundByPlayer.get(p.id);
      return debut !== undefined && debut <= roundNumber;
    });
  };

  const handleGameClick = (game: LocalRoundGame) => {
    if (readOnly) return;

    setSelectedGame(game);
    setDialogOpen(true);
  };

  const handleSaveScore = (gameId: string, team1Score: number, team2Score: number) => {
    // Persist immediately so the round updates behind the dialog; the score
    // entry dismisses itself after its result beat (see RoundGameScoreForm).
    onUpdateGame(gameId, team1Score, team2Score);
  };

  const handleGenerateRound = (newGames: LocalRoundGame[]) => {
    onAddRound(newGames);
  };

  const completedGames = games.filter((g) => g.completed).length;
  const totalGames = games.length;

  return (
    <div className="flex flex-col gap-4">
      {/* The hero above already carries live progress — one quiet line here
          is enough. (This panel used to restate the same count three ways.) */}
      <div className="premium-panel flex flex-col justify-between gap-3 rounded-lg p-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-display text-xl font-semibold tracking-tight">
            Matches
          </h2>
          <p className="text-sm text-muted-foreground">
            {completedGames} of {totalGames} games scored
            {settings.numberOfCourts > 1 && ` on ${settings.numberOfCourts} courts`}
          </p>
        </div>
      </div>

      {readOnly && (
        <Alert>
          <Eye />
          <AlertTitle>Spectator mode</AlertTitle>
          <AlertDescription>
            Scores and round status update here, but only the organizer can
            edit matches or generate rounds.
          </AlertDescription>
        </Alert>
      )}

      {/* Round Manager */}
      {!readOnly && (
        <RoundManager
          players={players}
          games={games}
          standings={standings}
          settings={settings}
          currentRound={currentRound}
          onGenerateRound={handleGenerateRound}
          onRemoveRound={onRemoveRound}
        />
      )}

      {/* Rounds List */}
      {/* rounds is newest-first: keep the latest round open, collapse older
          ones behind a tappable header so the list doesn't grow into a long
          scroll as the session runs. */}
      {rounds.map((roundNumber, index) => (
        <RoundGamesList
          key={roundNumber}
          games={games}
          roundNumber={roundNumber}
          courtWeights={courtWeights}
          byePlayers={getByePlayersForRound(roundNumber)}
          onScoreClick={handleGameClick}
          readOnly={readOnly}
          previousRoundCourts={courtsByRound.get(roundNumber - 1)}
          collapsible={index !== 0}
          defaultOpen={index === 0}
        />
      ))}

      {/* No rounds yet. Organizers already see the big "Start Round 1" button
          right above, so only spectators need an explanation here. */}
      {rounds.length === 0 && readOnly && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              Waiting for the organizer to start the first round. Matchups will
              show up here live.
            </p>
          </CardContent>
        </Card>
      )}

      <FormatSummaryCard settings={settings} />

      {/* Score Entry Dialog */}
      <RoundGameScoreEntry
        game={selectedGame}
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setSelectedGame(null);
        }}
        onSave={handleSaveScore}
        courtWeight={
          selectedGame && courtWeights
            ? courtWeights[selectedGame.courtNumber]
            : undefined
        }
        pointsToWin={settings.pointsToWin}
        winBy={settings.winBy}
      />
    </div>
  );
}
