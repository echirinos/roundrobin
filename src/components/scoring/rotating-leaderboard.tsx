"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NumberTicker } from "@/components/ui/number-ticker";
import { ShineBorder } from "@/components/ui/shine-border";
import { cn } from "@/lib/utils";
import type { LocalPlayer, LocalRoundGame, LocalStanding } from "@/src/types/database";
import type { ScoringType } from "@/src/types/formats";
import {
  calculateStandingsForFormat,
  getPrimaryMetric,
  getTiebreakerOrder,
  calculateRankChanges,
} from "@/src/lib/formats/scoring";
import { getDefaultCourtWeights } from "@/src/lib/formats/scoring";
import { DuprRatingBadge } from "@/src/components/dupr/dupr-login";

interface RotatingLeaderboardProps {
  players: LocalPlayer[];
  games: LocalRoundGame[];
  scoringType: ScoringType;
  numberOfCourts: number;
  previousStandings?: LocalStanding[];
  showCourtAssignments?: boolean;
}

export function RotatingLeaderboard({
  players,
  games,
  scoringType,
  numberOfCourts,
  previousStandings,
  showCourtAssignments = false,
}: RotatingLeaderboardProps) {
  const courtWeights = useMemo(
    () => getDefaultCourtWeights(numberOfCourts),
    [numberOfCourts]
  );

  const standings = useMemo(() => {
    return calculateStandingsForFormat(players, games, {
      scoringType,
      courtWeights,
      includePointDifferential: true,
    });
  }, [players, games, scoringType, courtWeights]);

  const rankChanges = useMemo(() => {
    if (!previousStandings) return new Map<string, number>();
    return calculateRankChanges(previousStandings, standings);
  }, [previousStandings, standings]);

  const hasGames = standings.some((s) => s.gamesPlayed > 0);
  const tiebreakerOrder = getTiebreakerOrder(scoringType);

  if (standings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Standings</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            No players yet. Add players to see standings.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-3">
            <CardTitle>Standings</CardTitle>
            <Badge variant="outline" className="text-xs">
              {scoringType === "court_weighted"
                ? "Court Points"
                : scoringType === "win_percentage"
                ? "Win %"
                : "Games Won"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <AnimatePresence mode="popLayout">
            {standings.map((standing, index) => {
              const rankChange = rankChanges.get(standing.player.id) ?? 0;
              const isLeader = index === 0 && standing.gamesWon > 0;
              const initial = standing.player.name.charAt(0).toUpperCase();

              // Medal emojis for top 3
              const getMedal = (rank: number) => {
                if (!hasGames) return null;
                if (rank === 0) return "1";
                if (rank === 1) return "2";
                if (rank === 2) return "3";
                return null;
              };
              const medal = getMedal(index);

              // Court assignment (for court-weighted formats)
              const courtAssignment = showCourtAssignments
                ? standing.currentCourt ?? Math.floor(index / 4) + 1
                : null;

              return (
                <motion.div
                  key={standing.player.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{
                    layout: { type: "spring", stiffness: 500, damping: 40 },
                    opacity: { duration: 0.2 },
                  }}
                  className={cn(
                    "relative overflow-hidden rounded-lg border p-3",
                    isLeader
                      ? "border-primary/55 bg-primary/10"
                      : index === 1 && hasGames
                      ? "border-live/40 bg-live/10"
                      : index === 2 && hasGames
                      ? "border-accent/45 bg-accent/10"
                      : "border-border/55 bg-background/55"
                  )}
                >
                  {isLeader && (
                    <ShineBorder
                      borderWidth={1}
                      duration={14}
                      shineColor={["var(--primary)", "var(--accent)"]}
                    />
                  )}
                  <div className="flex items-center gap-3">
                    <motion.div
                      className="font-display w-8 text-center text-xl font-semibold"
                      key={`rank-${index}`}
                      initial={{ scale: 1.5 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      {medal || index + 1}
                    </motion.div>

                    <motion.div
                      className={cn(
                        "flex size-10 shrink-0 items-center justify-center rounded-lg font-display font-semibold text-primary-foreground shadow-sm",
                        index === 0 && hasGames
                          ? "bg-primary"
                          : index === 1 && hasGames
                          ? "bg-live text-live-foreground"
                          : index === 2 && hasGames
                          ? "bg-accent text-accent-foreground"
                          : "bg-secondary text-secondary-foreground"
                      )}
                      whileHover={{ scale: 1.1 }}
                      transition={{ type: "spring", stiffness: 400 }}
                    >
                      {initial}
                    </motion.div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate font-semibold">
                          {standing.player.name}
                        </span>
                        {standing.player.duprRating && (
                          <DuprRatingBadge
                            rating={standing.player.duprRating}
                            provisional={standing.player.duprProvisional}
                            size="sm"
                          />
                        )}
                        {rankChange !== 0 && hasGames && (
                          <motion.span
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className={cn(
                              "text-xs font-semibold",
                              rankChange > 0 ? "text-success" : "text-destructive"
                            )}
                          >
                            {rankChange > 0 ? `+${rankChange}` : rankChange}
                          </motion.span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <span className="font-medium">
                          {standing.gamesWon}-{standing.gamesLost}
                        </span>
                        {standing.gamesPlayed > 0 && (
                          <>
                            <span className="text-muted-foreground/50">•</span>
                            <motion.span
                              key={`diff-${standing.pointDifferential}`}
                              initial={{ opacity: 0.5 }}
                              animate={{ opacity: 1 }}
                              className={cn(
                                "font-medium",
                                standing.pointDifferential > 0
                                  ? "text-success"
                                  : standing.pointDifferential < 0
                                  ? "text-destructive"
                                  : ""
                              )}
                            >
                              {standing.pointDifferential > 0 ? "+" : ""}
                              {standing.pointDifferential} PD
                            </motion.span>
                          </>
                        )}
                        {showCourtAssignments && courtAssignment && hasGames && (
                          <>
                            <span className="text-muted-foreground/50">•</span>
                            <Badge variant="outline" className="text-xs">
                              Court {courtAssignment}
                            </Badge>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <motion.div
                        className="font-display text-3xl font-semibold tabular-nums tracking-tight"
                        key={`metric-${getPrimaryMetric(standing, scoringType)}`}
                        initial={{ scale: 1.2 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        <NumberTicker
                          value={
                            scoringType === "court_weighted"
                              ? standing.courtWeightedPoints
                              : standing.winPercentage
                          }
                        />
                      </motion.div>
                      {standing.gamesPlayed > 0 && (
                        <div className="text-xs font-semibold text-muted-foreground">
                          {scoringType === "court_weighted" ? "PTS" : "WIN %"}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Tiebreaker info */}
      {hasGames && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-muted-foreground text-center"
        >
          Ranked by: {tiebreakerOrder.join(" → ")}
        </motion.p>
      )}
    </div>
  );
}

// Compact version for sidebars
interface CompactLeaderboardProps {
  standings: LocalStanding[];
  scoringType: ScoringType;
  limit?: number;
}

export function CompactLeaderboard({
  standings,
  scoringType,
  limit = 5,
}: CompactLeaderboardProps) {
  const displayStandings = standings.slice(0, limit);

  return (
    <div className="flex flex-col gap-1">
      {displayStandings.map((standing, index) => (
        <div
          key={standing.player.id}
          className="flex items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-secondary/40"
        >
          <span className="w-5 text-center font-display font-semibold text-muted-foreground">
            {index + 1}
          </span>
          <span className="flex-1 truncate">{standing.player.name}</span>
          <span className="font-data font-semibold">
            {scoringType === "court_weighted"
              ? standing.courtWeightedPoints
              : `${standing.winPercentage}%`}
          </span>
        </div>
      ))}
      {standings.length > limit && (
        <p className="text-xs text-muted-foreground text-center pt-1">
          +{standings.length - limit} more
        </p>
      )}
    </div>
  );
}

// Court-specific leaderboard (for King of Court style formats)
interface CourtLeaderboardProps {
  standings: LocalStanding[];
  numberOfCourts: number;
}

export function CourtLeaderboard({
  standings,
  numberOfCourts,
}: CourtLeaderboardProps) {
  // Group players by court
  const courtGroups = useMemo(() => {
    const groups = new Map<number, LocalStanding[]>();

    for (let court = 1; court <= numberOfCourts; court++) {
      groups.set(court, []);
    }

    // Assign 4 players per court based on rank
    standings.forEach((standing, index) => {
      const court = Math.min(Math.floor(index / 4) + 1, numberOfCourts);
      groups.get(court)?.push(standing);
    });

    return groups;
  }, [standings, numberOfCourts]);

  return (
    <div className="flex flex-col gap-4">
      {Array.from(courtGroups.entries()).map(([courtNumber, players]) => (
        <Card key={courtNumber}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-sm">
                {courtNumber === 1 ? "King Court" : `Court ${courtNumber}`}
              </CardTitle>
              <Badge
                variant={courtNumber === 1 ? "default" : "outline"}
                className="text-xs"
              >
                {numberOfCourts - courtNumber + 1}x points
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-1">
              {players.map((standing) => (
                <div
                  key={standing.player.id}
                  className="flex items-center justify-between rounded-md px-2 py-1 text-sm hover:bg-secondary/40"
                >
                  <span className="truncate">{standing.player.name}</span>
                  <span className="font-data text-muted-foreground">
                    {standing.gamesWon}-{standing.gamesLost}
                  </span>
                </div>
              ))}
              {players.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  No players assigned
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
