"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { LocalRoundGame, LocalPlayer } from "@/src/types/database";

interface RoundGameScoreEntryProps {
  game: LocalRoundGame | null;
  open: boolean;
  onClose: () => void;
  onSave: (gameId: string, team1Score: number, team2Score: number) => void;
  courtWeight?: number;
}

export function RoundGameScoreEntry({
  game,
  open,
  onClose,
  onSave,
  courtWeight,
}: RoundGameScoreEntryProps) {
  if (!game) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-[95vw] sm:max-w-md">
        <RoundGameScoreForm
          key={game.id}
          game={game}
          onClose={onClose}
          onSave={onSave}
          courtWeight={courtWeight}
        />
      </DialogContent>
    </Dialog>
  );
}

interface RoundGameScoreFormProps {
  game: LocalRoundGame;
  onClose: () => void;
  onSave: (gameId: string, team1Score: number, team2Score: number) => void;
  courtWeight?: number;
}

function RoundGameScoreForm({
  game,
  onClose,
  onSave,
  courtWeight,
}: RoundGameScoreFormProps) {
  const [score1, setScore1] = useState(game.team1Score?.toString() ?? "");
  const [score2, setScore2] = useState(game.team2Score?.toString() ?? "");

  const handleSave = () => {
    const s1 = parseInt(score1);
    const s2 = parseInt(score2);

    if (!isNaN(s1) && !isNaN(s2) && s1 >= 0 && s2 >= 0) {
      onSave(game.id, s1, s2);
      onClose();
    }
  };

  return (
    <>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-center flex-1">Enter Score</DialogTitle>
            {courtWeight && courtWeight > 1 && (
              <Badge variant="secondary" className="text-xs">
                {courtWeight}x points
              </Badge>
            )}
          </div>
          {game.courtNumber && (
            <p className="text-sm text-muted-foreground text-center">
              Court {game.courtNumber} • Round {game.round}
            </p>
          )}
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-4">
            {/* Team 1 */}
            <div className="space-y-2">
              <label className="text-sm font-medium block text-center">
                {game.team1[0].name} & {game.team1[1].name}
              </label>
              <Input
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                min="0"
                value={score1}
                onChange={(e) => setScore1(e.target.value)}
                placeholder="0"
                className="text-center text-3xl h-14 font-bold"
                autoFocus
              />
            </div>

            <div className="text-center text-muted-foreground font-medium">vs</div>

            {/* Team 2 */}
            <div className="space-y-2">
              <label className="text-sm font-medium block text-center">
                {game.team2[0].name} & {game.team2[1].name}
              </label>
              <Input
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                min="0"
                value={score2}
                onChange={(e) => setScore2(e.target.value)}
                placeholder="0"
                className="text-center text-3xl h-14 font-bold"
              />
            </div>
          </div>

          {/* Quick score buttons */}
          <div className="border-t pt-4">
            <p className="text-xs text-muted-foreground text-center mb-2">
              Quick scores
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {[
                [11, 0],
                [11, 5],
                [11, 7],
                [11, 9],
              ].map(([s1, s2]) => (
                <Button
                  key={`${s1}-${s2}`}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setScore1(s1.toString());
                    setScore2(s2.toString());
                  }}
                  className="text-xs"
                >
                  {s1}-{s2}
                </Button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!score1 || !score2}
            className="w-full sm:w-auto"
          >
            Save Score
          </Button>
        </DialogFooter>
    </>
  );
}

// Game card component for displaying games in a list
interface GameCardProps {
  game: LocalRoundGame;
  courtWeight?: number;
  onScoreClick: (game: LocalRoundGame) => void;
  readOnly?: boolean;
}

export function GameCard({
  game,
  courtWeight,
  onScoreClick,
  readOnly = false,
}: GameCardProps) {
  const team1Won = game.completed && (game.team1Score ?? 0) > (game.team2Score ?? 0);
  const team2Won = game.completed && (game.team2Score ?? 0) > (game.team1Score ?? 0);

  return (
    <button
      onClick={() => onScoreClick(game)}
      disabled={readOnly}
      className={cn(
        "w-full rounded-lg border p-3 text-left transition-colors disabled:opacity-100",
        readOnly && "cursor-default",
        game.completed
          ? "border-transparent bg-muted/50"
          : "border-dashed border-muted-foreground/25 bg-background hover:border-primary/50"
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0 space-y-2">
          {/* Team 1 */}
          <div className="flex items-center justify-between gap-2">
            <span
              className={`font-medium text-sm truncate ${
                team1Won ? "text-green-600 dark:text-green-400" : ""
              }`}
            >
              {game.team1[0].name} & {game.team1[1].name}
            </span>
            {game.completed && (
              <span
                className={`text-xl font-bold tabular-nums ${
                  team1Won
                    ? "text-green-600 dark:text-green-400"
                    : "text-muted-foreground"
                }`}
              >
                {game.team1Score}
              </span>
            )}
          </div>

          {/* Team 2 */}
          <div className="flex items-center justify-between gap-2">
            <span
              className={`font-medium text-sm truncate ${
                team2Won ? "text-green-600 dark:text-green-400" : ""
              }`}
            >
              {game.team2[0].name} & {game.team2[1].name}
            </span>
            {game.completed && (
              <span
                className={`text-xl font-bold tabular-nums ${
                  team2Won
                    ? "text-green-600 dark:text-green-400"
                    : "text-muted-foreground"
                }`}
              >
                {game.team2Score}
              </span>
            )}
          </div>
        </div>

        {/* Status badge */}
        {!game.completed && (
          <Badge variant="outline" className="shrink-0">
            {readOnly ? "Waiting" : "Score"}
          </Badge>
        )}
      </div>

      {/* Court weight indicator */}
      {courtWeight && courtWeight > 1 && (
        <div className="mt-2 text-xs text-muted-foreground">
          {courtWeight}x points for winner
        </div>
      )}
    </button>
  );
}

// Round games list component
interface RoundGamesListProps {
  games: LocalRoundGame[];
  roundNumber: number;
  courtWeights?: Record<number, number>;
  byePlayers?: LocalPlayer[];
  onScoreClick: (game: LocalRoundGame) => void;
  readOnly?: boolean;
}

export function RoundGamesList({
  games,
  roundNumber,
  courtWeights,
  byePlayers = [],
  onScoreClick,
  readOnly = false,
}: RoundGamesListProps) {
  const roundGames = games.filter((g) => g.round === roundNumber);
  const completedCount = roundGames.filter((g) => g.completed).length;
  const roundComplete = completedCount === roundGames.length && roundGames.length > 0;

  // Group games by court
  const gamesByCourt = roundGames.reduce((acc, game) => {
    const court = game.courtNumber || 1;
    if (!acc[court]) acc[court] = [];
    acc[court].push(game);
    return acc;
  }, {} as Record<number, LocalRoundGame[]>);

  const courts = Object.keys(gamesByCourt)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>Round {roundNumber}</span>
            {roundComplete && (
              <Badge variant="secondary" className="text-xs">
                Finished
              </Badge>
            )}
          </div>
          <Badge variant="outline">
            {completedCount}/{roundGames.length}
          </Badge>
        </CardTitle>
        {byePlayers.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Sitting out: {byePlayers.map((p) => p.name).join(", ")}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        {courts.map((courtNumber) => (
          <div key={courtNumber} className="space-y-2">
            {/* Court header (only if multiple courts) */}
            {courts.length > 1 && (
              <div className="flex items-center gap-2">
                <div className="text-xs font-medium text-muted-foreground">
                  Court {courtNumber}
                </div>
                {courtWeights && courtWeights[courtNumber] && courtWeights[courtNumber] > 1 && (
                  <Badge variant="outline" className="text-xs py-0">
                    {courtWeights[courtNumber]}x
                  </Badge>
                )}
              </div>
            )}

            {/* Games on this court */}
            {gamesByCourt[courtNumber].map((game) => (
              <GameCard
                key={game.id}
                game={game}
                courtWeight={courtWeights?.[courtNumber]}
                onScoreClick={onScoreClick}
                readOnly={readOnly}
              />
            ))}
          </div>
        ))}

        {roundGames.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No games in this round
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// Multi-game score entry (for formats like Double Header)
interface MultiGameScoreEntryProps {
  games: LocalRoundGame[];
  open: boolean;
  onClose: () => void;
  onSave: (scores: Array<{ gameId: string; team1Score: number; team2Score: number }>) => void;
}

export function MultiGameScoreEntry({
  games,
  open,
  onClose,
  onSave,
}: MultiGameScoreEntryProps) {
  if (games.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-[95vw] sm:max-w-lg">
        <MultiGameScoreForm
          key={games.map((game) => game.id).join("-")}
          games={games}
          onClose={onClose}
          onSave={onSave}
        />
      </DialogContent>
    </Dialog>
  );
}

interface MultiGameScoreFormProps {
  games: LocalRoundGame[];
  onClose: () => void;
  onSave: (scores: Array<{ gameId: string; team1Score: number; team2Score: number }>) => void;
}

function MultiGameScoreForm({
  games,
  onClose,
  onSave,
}: MultiGameScoreFormProps) {
  const [scores, setScores] = useState<Array<{ team1: string; team2: string }>>(
    () =>
      games.map((game) => ({
        team1: game.team1Score?.toString() ?? "",
        team2: game.team2Score?.toString() ?? "",
      }))
  );

  const handleSave = () => {
    const validScores = scores.map((score, index) => ({
      gameId: games[index].id,
      team1Score: parseInt(score.team1) || 0,
      team2Score: parseInt(score.team2) || 0,
    }));

    const allValid = validScores.every(
      (score) => !isNaN(score.team1Score) && !isNaN(score.team2Score)
    );

    if (allValid) {
      onSave(validScores);
      onClose();
    }
  };

  const firstGame = games[0];

  return (
    <>
        <DialogHeader>
          <DialogTitle className="text-center">
            Enter Scores ({games.length} games)
          </DialogTitle>
          <p className="text-sm text-muted-foreground text-center">
            {firstGame.team1[0].name} & {firstGame.team1[1].name} vs{" "}
            {firstGame.team2[0].name} & {firstGame.team2[1].name}
          </p>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {games.map((game, idx) => (
            <div key={game.id} className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground w-16">
                Game {idx + 1}
              </div>
              <Input
                type="number"
                inputMode="numeric"
                min="0"
                value={scores[idx]?.team1 ?? ""}
                onChange={(e) => {
                  const newScores = [...scores];
                  newScores[idx] = { ...newScores[idx], team1: e.target.value };
                  setScores(newScores);
                }}
                placeholder="0"
                className="text-center text-xl font-bold w-20"
              />
              <span className="text-muted-foreground">-</span>
              <Input
                type="number"
                inputMode="numeric"
                min="0"
                value={scores[idx]?.team2 ?? ""}
                onChange={(e) => {
                  const newScores = [...scores];
                  newScores[idx] = { ...newScores[idx], team2: e.target.value };
                  setScores(newScores);
                }}
                placeholder="0"
                className="text-center text-xl font-bold w-20"
              />
            </div>
          ))}
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button onClick={handleSave} className="w-full sm:w-auto">
            Save All Scores
          </Button>
        </DialogFooter>
    </>
  );
}
