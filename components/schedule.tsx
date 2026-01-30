"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Match, Player } from "@/lib/types";
import { ScoreDialog } from "./score-dialog";
import { generateNextRound } from "@/lib/tournament";

interface ScheduleProps {
  matches: Match[];
  players: Player[];
  onUpdateMatch: (matchId: string, score1: number, score2: number) => void;
  onAddRound: (newMatches: Match[]) => void;
}

export function Schedule({
  matches,
  players,
  onUpdateMatch,
  onAddRound,
}: ScheduleProps) {
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Group matches by round
  const matchesByRound = matches.reduce((acc, match) => {
    if (!acc[match.round]) acc[match.round] = [];
    acc[match.round].push(match);
    return acc;
  }, {} as Record<number, Match[]>);

  const rounds = Object.keys(matchesByRound)
    .map(Number)
    .sort((a, b) => a - b);

  const handleMatchClick = (match: Match) => {
    setSelectedMatch(match);
    setDialogOpen(true);
  };

  const handleSaveScore = (matchId: string, score1: number, score2: number) => {
    onUpdateMatch(matchId, score1, score2);
  };

  const handleAddRound = () => {
    const newMatches = generateNextRound(players, matches);
    if (newMatches.length > 0) {
      onAddRound(newMatches);
    }
  };

  const completedMatches = matches.filter((m) => m.completed).length;
  const totalMatches = matches.length;

  // Find players on bye for each round
  const getPlayersOnBye = (round: number) => {
    const playingIds = new Set<string>();
    matchesByRound[round]?.forEach(m => {
      m.team1.forEach(p => playingIds.add(p.id));
      m.team2.forEach(p => playingIds.add(p.id));
    });
    return players.filter(p => !playingIds.has(p.id));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Matches</h2>
          <p className="text-sm text-muted-foreground">
            {completedMatches} of {totalMatches} games completed
          </p>
        </div>
        <Button onClick={handleAddRound} variant="outline" className="w-full sm:w-auto">
          + Add Round
        </Button>
      </div>

      {rounds.map((round) => {
        const byePlayers = getPlayersOnBye(round);
        return (
          <Card key={round}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                <span>Round {round}</span>
                <Badge variant="secondary">
                  {matchesByRound[round].filter((m) => m.completed).length}/
                  {matchesByRound[round].length}
                </Badge>
              </CardTitle>
              {byePlayers.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Sitting out: {byePlayers.map(p => p.name).join(", ")}
                </p>
              )}
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {matchesByRound[round].map((match) => (
                <button
                  key={match.id}
                  onClick={() => handleMatchClick(match)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    match.completed
                      ? "bg-muted/50 border-transparent"
                      : "bg-background border-dashed border-muted-foreground/25 hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`font-medium text-sm truncate ${
                            match.completed && match.score1! > match.score2!
                              ? "text-green-600 dark:text-green-400"
                              : ""
                          }`}
                        >
                          {match.team1[0].name} & {match.team1[1].name}
                        </span>
                        {match.completed ? (
                          <span
                            className={`text-xl font-bold tabular-nums ${
                              match.score1! > match.score2!
                                ? "text-green-600 dark:text-green-400"
                                : "text-muted-foreground"
                            }`}
                          >
                            {match.score1}
                          </span>
                        ) : null}
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`font-medium text-sm truncate ${
                            match.completed && match.score2! > match.score1!
                              ? "text-green-600 dark:text-green-400"
                              : ""
                          }`}
                        >
                          {match.team2[0].name} & {match.team2[1].name}
                        </span>
                        {match.completed ? (
                          <span
                            className={`text-xl font-bold tabular-nums ${
                              match.score2! > match.score1!
                                ? "text-green-600 dark:text-green-400"
                                : "text-muted-foreground"
                            }`}
                          >
                            {match.score2}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    {!match.completed && (
                      <Badge variant="outline" className="shrink-0">
                        Score
                      </Badge>
                    )}
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        );
      })}

      <ScoreDialog
        match={selectedMatch}
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setSelectedMatch(null);
        }}
        onSave={handleSaveScore}
      />
    </div>
  );
}
