"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { LocalPlayer, LocalRoundGame, LocalStanding } from "@/src/types/database";
import type { EventSettings } from "@/src/types/formats";
import { RoundGameScoreEntry, RoundGamesList } from "@/src/components/scoring/round-game-score-entry";
import { RoundManager } from "./round-manager";
import { getDefaultCourtWeights } from "@/src/lib/formats/scoring";
import { Eye } from "lucide-react";

interface EnhancedScheduleProps {
  games: LocalRoundGame[];
  players: LocalPlayer[];
  standings: LocalStanding[];
  settings: EventSettings;
  currentRound: number;
  onUpdateGame: (gameId: string, team1Score: number, team2Score: number) => void;
  onAddRound: (newGames: LocalRoundGame[]) => void;
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

  // Get bye players for each round
  const getByePlayersForRound = (roundNumber: number): LocalPlayer[] => {
    const roundGames = gamesByRound[roundNumber] || [];
    const playingIds = new Set<string>();

    roundGames.forEach((game) => {
      game.team1.forEach((p) => playingIds.add(p.id));
      game.team2.forEach((p) => playingIds.add(p.id));
    });

    return players.filter((p) => !playingIds.has(p.id));
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
      <div className="premium-panel flex flex-col justify-between gap-3 rounded-lg p-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-display text-xl font-semibold tracking-tight">
            Matches
          </h2>
          <p className="text-sm text-muted-foreground">
            {completedGames} of {totalGames} games completed
            {settings.numberOfCourts > 1 && ` • ${settings.numberOfCourts} courts`}
          </p>
        </div>
        <div className="flex gap-2">
          <span className="data-chip">{completedGames}/{totalGames} scored</span>
          <span className="data-chip">{settings.numberOfCourts} courts</span>
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
        />
      )}

      {/* Rounds List */}
      {rounds.map((roundNumber) => (
        <RoundGamesList
          key={roundNumber}
          games={games}
          roundNumber={roundNumber}
          courtWeights={courtWeights}
          byePlayers={getByePlayersForRound(roundNumber)}
          onScoreClick={handleGameClick}
          readOnly={readOnly}
        />
      ))}

      {/* No rounds yet */}
      {rounds.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              No games yet. Use the Round Manager above to generate your first round.
            </p>
          </CardContent>
        </Card>
      )}

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
      />
    </div>
  );
}
