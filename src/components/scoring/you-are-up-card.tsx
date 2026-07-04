"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowDown, ArrowUp, Armchair, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { LocalPlayer, LocalRoundGame } from "@/src/types/database";

interface YouAreUpCardProps {
  playerId: string;
  players: LocalPlayer[];
  games: LocalRoundGame[];
  /** Show moved up/down vs the previous round (standings-movement formats). */
  showMovement?: boolean;
}

interface PlayerRoundInfo {
  round: number;
  game: LocalRoundGame | null;
  partner: LocalPlayer | null;
  opponents: LocalPlayer[];
}

function getPlayerRoundInfo(
  playerId: string,
  games: LocalRoundGame[],
  round: number
): PlayerRoundInfo {
  // Formats like Double Header schedule several games per round; stay in the
  // "you're up" state until every one of the player's games is scored.
  const myRoundGames = games.filter(
    (g) =>
      g.round === round &&
      [...g.team1, ...g.team2].some((p) => p.id === playerId)
  );
  const game =
    myRoundGames.find((g) => !g.completed) ??
    myRoundGames[myRoundGames.length - 1] ??
    null;

  if (!game) {
    return { round, game: null, partner: null, opponents: [] };
  }

  const onTeam1 = game.team1.some((p) => p.id === playerId);
  const myTeam = onTeam1 ? game.team1 : game.team2;
  const opponents = onTeam1 ? [...game.team2] : [...game.team1];
  const partner = myTeam.find((p) => p.id !== playerId) ?? null;

  return { round, game, partner, opponents };
}

export function YouAreUpCard({
  playerId,
  players,
  games,
  showMovement = false,
}: YouAreUpCardProps) {
  const reduceMotion = useReducedMotion();
  const info = useMemo(() => {
    const latestRound = games.reduce((max, g) => Math.max(max, g.round), 0);
    if (latestRound === 0) return null;

    // Casual formats can open round N+1 while round N still has unplayed
    // games — the player's next action is their EARLIEST pending game, not
    // whatever the newest round says about them.
    const myPendingRounds = games
      .filter(
        (g) =>
          !g.completed &&
          [...g.team1, ...g.team2].some((p) => p.id === playerId)
      )
      .map((g) => g.round);
    const focusRound = myPendingRounds.length
      ? Math.min(...myPendingRounds)
      : latestRound;

    const current = getPlayerRoundInfo(playerId, games, focusRound);
    const previous =
      focusRound > 1
        ? getPlayerRoundInfo(playerId, games, focusRound - 1)
        : null;

    let movement: "up" | "down" | "stay" | null = null;
    if (
      current.game &&
      previous?.game &&
      current.game.courtNumber &&
      previous.game.courtNumber
    ) {
      if (current.game.courtNumber < previous.game.courtNumber) movement = "up";
      else if (current.game.courtNumber > previous.game.courtNumber)
        movement = "down";
      else movement = "stay";
    }

    return { ...current, movement };
  }, [playerId, games]);

  const me = players.find((p) => p.id === playerId);
  if (!info || !me) return null;

  // Sitting out this round
  if (!info.game) {
    return (
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 rounded-lg border border-border/70 bg-muted/30 p-3"
        data-testid="you-are-up-sitting"
      >
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
          <Armchair className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold">
            {me.name}, you sit out Round {info.round}
          </p>
          <p className="text-xs text-muted-foreground">
            You&apos;re in the queue for the next round.
          </p>
        </div>
      </motion.div>
    );
  }

  const scored = info.game.completed;

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative overflow-hidden rounded-lg border p-3",
        scored
          ? "border-border/70 bg-card/70"
          : "border-primary/50 bg-primary/10"
      )}
      data-testid="you-are-up"
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex size-12 shrink-0 flex-col items-center justify-center rounded-lg font-display font-semibold",
            scored
              ? "bg-secondary text-secondary-foreground"
              : "bg-primary text-primary-foreground"
          )}
        >
          <MapPin className="size-3.5" />
          <span className="text-lg leading-tight">
            {info.game.courtNumber}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold">
              {scored
                ? `${me.name}, your Round ${info.round} game is done`
                : `${me.name}, you're up on Court ${info.game.courtNumber}`}
            </p>
            {showMovement && !scored && info.movement === "up" && (
              <Badge className="gap-1 border-transparent bg-success/15 text-success-strong shadow-none text-xs">
                <ArrowUp className="size-3" /> Moved up
              </Badge>
            )}
            {showMovement && !scored && info.movement === "down" && (
              <Badge variant="secondary" className="gap-1 text-xs">
                <ArrowDown className="size-3" /> Moved down
              </Badge>
            )}
            {showMovement && !scored && info.movement === "stay" && (
              <Badge variant="outline" className="text-xs">
                Holding court
              </Badge>
            )}
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {info.partner ? `With ${info.partner.name}` : "Singles"} vs{" "}
            {info.opponents.map((p) => p.name).join(" & ")}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
