"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Medal, Award } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NumberTicker } from "@/components/ui/number-ticker";
import { ShineBorder } from "@/components/ui/shine-border";
import { cn } from "@/lib/utils";
import type { LocalPlayer, LocalRoundGame, LocalStanding } from "@/src/types/database";
import type { ScoringType } from "@/src/types/formats";
import {
  calculateStandingsForFormat,
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
        {/* No metric badge up here: it looked tappable, and "Point margin"
            beside "Standings" read as the ranking rule (it isn't — the footer
            explains the real order). */}
        <CardHeader className="pb-2">
          <CardTitle>Standings</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <AnimatePresence mode="popLayout">
            {standings.map((standing, index) => {
              const rankChange = rankChanges.get(standing.player.id) ?? 0;
              const isLeader = index === 0 && standing.gamesWon > 0;
              const initial = standing.player.name.charAt(0).toUpperCase();

              // Trophy for the leader, medals for the podium — icons only once
              // there are games to rank by (otherwise show plain rank numbers).
              const PodiumIcon =
                hasGames && index === 0
                  ? Trophy
                  : hasGames && index === 1
                  ? Medal
                  : hasGames && index === 2
                  ? Award
                  : null;
              const podiumIconColor =
                index === 0
                  ? "text-primary"
                  : index === 1
                  ? "text-live"
                  : "text-accent";

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
                      className="font-display flex w-8 items-center justify-center text-xl font-semibold"
                      key={`rank-${index}`}
                      initial={{ scale: 1.5 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      {PodiumIcon ? (
                        <PodiumIcon
                          className={cn("size-5", podiumIconColor)}
                          aria-label={`Rank ${index + 1}`}
                        />
                      ) : (
                        index + 1
                      )}
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
                        {/* Wrap, never clip: fixed-team rows carry both names
                            ("Christopher & Alexandra") and spectators on
                            phones must be able to read them in full. */}
                        <span className="min-w-0 break-words font-semibold leading-snug">
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
                        {/* For win-based formats margin is the big number, so
                            the subtitle carries win rate; court-weighted keeps
                            margin here since court points are the big number. */}
                        {standing.gamesPlayed > 0 && (
                          <>
                            <span className="text-muted-foreground/50">•</span>
                            {scoringType === "court_weighted" ? (
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
                                {standing.pointDifferential} margin
                              </motion.span>
                            ) : (
                              <span className="font-medium">
                                {standing.winPercentage}% wins
                              </span>
                            )}
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
                        className={cn(
                          "font-display text-3xl font-semibold tabular-nums tracking-tight",
                          scoringType === "court_weighted"
                            ? ""
                            : standing.pointDifferential > 0
                            ? "text-success"
                            : standing.pointDifferential < 0
                            ? "text-destructive"
                            : ""
                        )}
                        key={`metric-${
                          scoringType === "court_weighted"
                            ? standing.courtWeightedPoints
                            : standing.pointDifferential
                        }`}
                        initial={{ scale: 1.2 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        {scoringType !== "court_weighted" &&
                          standing.pointDifferential > 0 &&
                          "+"}
                        <NumberTicker
                          value={
                            scoringType === "court_weighted"
                              ? standing.courtWeightedPoints
                              : standing.pointDifferential
                          }
                        />
                      </motion.div>
                      {/* "margin" (not "point margin") keeps this column
                          narrow so long team names get the width to wrap at
                          word boundaries on phones; the footer defines it. */}
                      <div className="text-xs font-semibold text-muted-foreground">
                        {scoringType === "court_weighted" ? "court pts" : "margin"}
                      </div>
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
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col gap-1 text-center text-xs text-muted-foreground"
        >
          <p>Ranked by {tiebreakerOrder[0].toLowerCase()}. Ties broken by {tiebreakerOrder.slice(1).join(", then ").toLowerCase()}.</p>
          <p>Margin = your points scored minus points given up. Higher is better.</p>
        </motion.div>
      )}
    </div>
  );
}

// CompactLeaderboard and CourtLeaderboard used to live here. Both were
// removed: nothing rendered Compact, and Court duplicated the main list
// (which already shows per-row court badges) as a confusing second board.
