"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
          <AnimatePresence mode="popLayout">
            {standings.map((standing, index) => {
              const isLeader = index === 0 && standing.wins > 0;
              const initial = standing.player.name.charAt(0).toUpperCase();

              // Medal emojis for top 3
              const getMedal = (rank: number) => {
                if (!hasGames) return null;
                if (rank === 0) return "🥇";
                if (rank === 1) return "🥈";
                if (rank === 2) return "🥉";
                return null;
              };
              const medal = getMedal(index);

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
                    {/* Rank with medal */}
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

                    {/* Name and record */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {standing.player.name}
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <span className="font-medium">
                          {standing.wins}-{standing.losses}-0
                        </span>
                        {standing.gamesPlayed > 0 && (
                          <>
                            <span className="text-muted-foreground/50">•</span>
                            <motion.span
                              key={`apd-${standing.apd}`}
                              initial={{ opacity: 0.5 }}
                              animate={{ opacity: 1 }}
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
                            </motion.span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Win percentage */}
                    <div className="text-right shrink-0">
                      <motion.div
                        className="text-2xl font-bold tabular-nums"
                        key={`winpct-${standing.winPct}`}
                        initial={{ scale: 1.2 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        {standing.winPct}
                      </motion.div>
                      {standing.gamesPlayed > 0 && (
                        <div className="text-xs text-muted-foreground">WIN %</div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </CardContent>
      </Card>
      {hasGames && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-muted-foreground text-center"
        >
          Ranked by: Wins → APD (Avg Point Diff) → Points For
        </motion.p>
      )}
    </div>
  );
}
