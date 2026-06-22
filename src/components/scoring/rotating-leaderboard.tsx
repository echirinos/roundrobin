"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { LocalPlayer, LocalRoundGame, LocalStanding } from "@/src/types/database";
import type { ScoringType, EventFormat } from "@/src/types/formats";
import {
  calculateStandingsForFormat,
  getScoringSummary,
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
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
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
        <CardContent className="space-y-2">
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
                  className={`p-3 rounded-lg border ${
                    isLeader
                      ? "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-300 dark:border-yellow-700"
                      : index === 1 && hasGames
                      ? "bg-slate-50 dark:bg-slate-900/30 border-slate-300 dark:border-slate-600"
                      : index === 2 && hasGames
                      ? "bg-orange-50 dark:bg-orange-950/20 border-orange-300 dark:border-orange-800"
                      : "bg-muted/50 border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Rank */}
                    <motion.div
                      className="text-xl font-bold w-8 text-center"
                      key={`rank-${index}`}
                      initial={{ scale: 1.5 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      {medal || index + 1}
                    </motion.div>

                    {/* Avatar */}
                    <motion.div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shrink-0 ${
                        index === 0 && hasGames
                          ? "bg-yellow-500"
                          : index === 1 && hasGames
                          ? "bg-slate-400"
                          : index === 2 && hasGames
                          ? "bg-orange-400"
                          : "bg-primary"
                      }`}
                      whileHover={{ scale: 1.1 }}
                      transition={{ type: "spring", stiffness: 400 }}
                    >
                      {initial}
                    </motion.div>

                    {/* Name and stats */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium truncate">
                          {standing.player.name}
                        </span>
                        {/* DUPR Rating Badge */}
                        {standing.player.duprRating && (
                          <DuprRatingBadge
                            rating={standing.player.duprRating}
                            provisional={standing.player.duprProvisional}
                            size="sm"
                          />
                        )}
                        {/* Rank change indicator */}
                        {rankChange !== 0 && hasGames && (
                          <motion.span
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className={`text-xs ${
                              rankChange > 0
                                ? "text-green-600 dark:text-green-400"
                                : "text-red-600 dark:text-red-400"
                            }`}
                          >
                            {rankChange > 0 ? `+${rankChange}` : rankChange}
                          </motion.span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
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
                              className={
                                standing.pointDifferential > 0
                                  ? "text-green-600 dark:text-green-400"
                                  : standing.pointDifferential < 0
                                  ? "text-red-600 dark:text-red-400"
                                  : ""
                              }
                            >
                              {standing.pointDifferential > 0 ? "+" : ""}
                              {standing.pointDifferential} PD
                            </motion.span>
                          </>
                        )}
                        {/* Court assignment badge */}
                        {showCourtAssignments && courtAssignment && hasGames && (
                          <>
                            <span className="text-muted-foreground/50">•</span>
                            <Badge variant="outline" className="text-xs py-0">
                              Court {courtAssignment}
                            </Badge>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Primary Metric */}
                    <div className="text-right shrink-0">
                      <motion.div
                        className="text-2xl font-bold tabular-nums"
                        key={`metric-${getPrimaryMetric(standing, scoringType)}`}
                        initial={{ scale: 1.2 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        {scoringType === "court_weighted"
                          ? standing.courtWeightedPoints
                          : standing.winPercentage}
                      </motion.div>
                      {standing.gamesPlayed > 0 && (
                        <div className="text-xs text-muted-foreground">
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
  const hasGames = standings.some((s) => s.gamesPlayed > 0);

  return (
    <div className="space-y-1">
      {displayStandings.map((standing, index) => (
        <div
          key={standing.player.id}
          className="flex items-center gap-2 text-sm py-1"
        >
          <span className="w-5 text-center font-medium text-muted-foreground">
            {index + 1}
          </span>
          <span className="flex-1 truncate">{standing.player.name}</span>
          <span className="font-mono font-medium">
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
    <div className="space-y-4">
      {Array.from(courtGroups.entries()).map(([courtNumber, players]) => (
        <Card key={courtNumber}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
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
            <div className="space-y-1">
              {players.map((standing) => (
                <div
                  key={standing.player.id}
                  className="flex items-center justify-between text-sm py-1"
                >
                  <span className="truncate">{standing.player.name}</span>
                  <span className="font-mono text-muted-foreground">
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
