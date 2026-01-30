"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlayerStanding } from "@/lib/types";

interface StandingsProps {
  standings: PlayerStanding[];
}

export function Standings({ standings }: StandingsProps) {
  if (standings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Standings</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            No standings yet. Generate a round and enter scores to see standings.
          </p>
        </CardContent>
      </Card>
    );
  }

  const hasGames = standings.some(s => s.gamesPlayed > 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Standings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {standings.map((standing, index) => {
            const isLeader = index === 0 && standing.wins > 0;
            return (
              <div
                key={standing.player.id}
                className={`p-3 rounded-lg border ${
                  isLeader
                    ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800"
                    : "bg-muted/50 border-transparent"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                        isLeader
                          ? "bg-green-600 text-white"
                          : "bg-muted-foreground/20"
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium truncate flex items-center gap-2">
                        {standing.player.name}
                        {isLeader && (
                          <Badge variant="default" className="text-xs shrink-0">
                            Leader
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {standing.wins}W - {standing.losses}L
                        {standing.gamesPlayed > 0 && (
                          <span className="ml-1">
                            ({standing.gamesPlayed} game{standing.gamesPlayed !== 1 ? "s" : ""})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div
                      className={`text-xl font-bold tabular-nums ${
                        standing.pointDiff > 0
                          ? "text-green-600 dark:text-green-400"
                          : standing.pointDiff < 0
                          ? "text-red-600 dark:text-red-400"
                          : ""
                      }`}
                    >
                      {standing.pointDiff > 0 ? "+" : ""}
                      {standing.pointDiff}
                    </div>
                    <div className="text-xs text-muted-foreground tabular-nums">
                      {standing.pointsFor} - {standing.pointsAgainst}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
      {hasGames && (
        <p className="text-xs text-muted-foreground text-center">
          Ranked by: Wins → Point Diff → Points For
        </p>
      )}
    </div>
  );
}
