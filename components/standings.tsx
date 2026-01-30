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
            const initial = standing.player.name.charAt(0).toUpperCase();

            return (
              <div
                key={standing.player.id}
                className={`p-3 rounded-lg border ${
                  isLeader
                    ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800"
                    : "bg-muted/50 border-transparent"
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Rank */}
                  <div className="text-lg font-bold text-muted-foreground w-6 text-center">
                    {index + 1}
                  </div>

                  {/* Avatar */}
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shrink-0 ${
                      isLeader ? "bg-green-600" : "bg-primary"
                    }`}
                  >
                    {initial}
                  </div>

                  {/* Name and record */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate flex items-center gap-2">
                      {standing.player.name}
                      {isLeader && (
                        <Badge variant="default" className="text-xs shrink-0">
                          Leader
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <span className="font-medium">
                        {standing.wins}-{standing.losses}-0
                      </span>
                      {standing.gamesPlayed > 0 && (
                        <>
                          <span className="text-muted-foreground/50">•</span>
                          <span
                            className={
                              standing.apd > 0
                                ? "text-green-600 dark:text-green-400"
                                : standing.apd < 0
                                ? "text-red-600 dark:text-red-400"
                                : ""
                            }
                          >
                            {standing.apd > 0 ? "+" : ""}
                            {standing.apd.toFixed(2)} APD
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Win percentage */}
                  <div className="text-right shrink-0">
                    <div className="text-2xl font-bold tabular-nums">
                      {standing.winPct}
                    </div>
                    {standing.gamesPlayed > 0 && (
                      <div className="text-xs text-muted-foreground">WIN %</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
      {hasGames && (
        <p className="text-xs text-muted-foreground text-center">
          Ranked by: Wins → APD (Avg Point Diff) → Points For
        </p>
      )}
    </div>
  );
}
