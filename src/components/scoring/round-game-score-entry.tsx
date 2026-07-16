"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowDown, ArrowUp, ArrowUpDown, Check, ChevronDown } from "lucide-react";
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
import { NumberTicker } from "@/components/ui/number-ticker";
import { ShineBorder } from "@/components/ui/shine-border";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { TextureButton } from "@/components/ui/texture-button";
import { cn } from "@/lib/utils";
import type { LocalRoundGame, LocalPlayer } from "@/src/types/database";

interface RoundGameScoreEntryProps {
  game: LocalRoundGame | null;
  open: boolean;
  onClose: () => void;
  onSave: (gameId: string, team1Score: number, team2Score: number) => void;
  courtWeight?: number;
  /** Session game rules — enables the gentle "unusual score" heads-up. */
  pointsToWin?: number;
  winBy?: number;
}

export function RoundGameScoreEntry({
  game,
  open,
  onClose,
  onSave,
  courtWeight,
  pointsToWin,
  winBy,
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
          pointsToWin={pointsToWin}
          winBy={winBy}
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
  pointsToWin?: number;
  winBy?: number;
}

function RoundGameScoreForm({
  game,
  onClose,
  onSave,
  courtWeight,
  pointsToWin,
  winBy,
}: RoundGameScoreFormProps) {
  const [score1, setScore1] = useState(game.team1Score?.toString() ?? "");
  const [score2, setScore2] = useState(game.team2Score?.toString() ?? "");
  const [saved, setSaved] = useState<{ s1: number; s2: number } | null>(null);
  const reduceMotion = useReducedMotion();
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    []
  );

  const handleSave = () => {
    if (saved) return; // guard against a double-submit before the result view mounts

    const s1 = parseInt(score1);
    const s2 = parseInt(score2);

    if (!isNaN(s1) && !isNaN(s2) && s1 >= 0 && s2 >= 0) {
      // Persist first (the card behind updates), then hold the dialog on a result
      // beat so the score entry has a felt payoff before it dismisses itself. The
      // delay lets the NumberTicker roll settle before auto-dismiss.
      onSave(game.id, s1, s2);
      setSaved({ s1, s2 });
      if (closeTimer.current) clearTimeout(closeTimer.current);
      closeTimer.current = setTimeout(onClose, reduceMotion ? 1100 : 1900);
    }
  };

  // Gentle nudge, never a block: open-play games do end early or at odd
  // scores, but a silently-saved 11-10 under "win by 2" looks like a bug.
  // Ties (diff 0 < winBy) get the same nudge — they're the most unusual
  // score of all, and they still save (the standings engine supports them).
  // Overshoots are flagged too: past points-to-win a real game ends the
  // moment the lead hits win-by, so 12-5 or 111-4 is almost surely a typo
  // while overtime scores like 12-10 pass.
  const s1Num = parseInt(score1);
  const s2Num = parseInt(score2);
  const bothEntered = !isNaN(s1Num) && !isNaN(s2Num);
  const scoreDiff = Math.abs(s1Num - s2Num);
  const scoreMax = Math.max(s1Num, s2Num);
  const isUnusualScore =
    bothEntered &&
    typeof pointsToWin === "number" &&
    typeof winBy === "number" &&
    (scoreMax < pointsToWin ||
      scoreDiff < winBy ||
      (scoreMax > pointsToWin && scoreDiff !== winBy));

  const presetTarget = pointsToWin ?? 11;
  const presetWinBy = winBy ?? 2;
  const quickScorePresets = [
    ...new Set(
      [0, 5, 7, presetTarget - presetWinBy].filter(
        (loser) => loser >= 0 && presetTarget - loser >= presetWinBy
      )
    ),
  ].map((loser): [number, number] => [presetTarget, loser]);

  if (saved) {
    return (
      <ScoreSavedView
        team1={`${game.team1[0].name} & ${game.team1[1].name}`}
        team2={`${game.team2[0].name} & ${game.team2[1].name}`}
        s1={saved.s1}
        s2={saved.s2}
        reduceMotion={!!reduceMotion}
      />
    );
  }

  return (
    <>
      <DialogHeader>
        <div className="flex items-center justify-between gap-3 pr-8">
          <DialogTitle className="font-display text-left text-2xl">
            Enter score
          </DialogTitle>
          {courtWeight && courtWeight > 1 && (
            <Badge variant="secondary" className="text-xs">
              Top court · {courtWeight}x
            </Badge>
          )}
        </div>
        {game.courtNumber && (
          <p className="text-sm text-muted-foreground">
            Court {game.courtNumber} / Round {game.round}
          </p>
        )}
      </DialogHeader>
      <div className="flex flex-col gap-5 py-2">
        <div className="grid gap-3">
          <motion.div
            layout
            className="rounded-lg border border-border/70 bg-background/65 p-3 shadow-inner"
          >
            <label className="block text-center text-sm font-semibold">
              <span className="break-words">
                {game.team1[0].name} & {game.team1[1].name}
              </span>
            </label>
            <Input
              type="number"
              inputMode="numeric"
              pattern="[0-9]*"
              min="0"
              value={score1}
              onChange={(e) => setScore1(e.target.value)}
              placeholder="0"
              className="font-display mt-2 h-16 text-center text-5xl font-semibold tracking-tight"
              autoFocus
            />
          </motion.div>

          <div className="flex items-center justify-center gap-3 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            <span className="h-px w-12 bg-border" />
            vs
            <span className="h-px w-12 bg-border" />
            {/* Quick scores fill the top team as the winner; this flips them
                in one tap when the bottom team actually won. */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setScore1(score2);
                setScore2(score1);
              }}
              disabled={!score1 && !score2}
              className="h-8 gap-1 px-2 text-xs font-semibold normal-case tracking-normal text-muted-foreground"
              aria-label="Swap the two scores"
            >
              <ArrowUpDown className="size-3.5" />
              Swap
            </Button>
          </div>

          <motion.div
            layout
            className="rounded-lg border border-border/70 bg-background/65 p-3 shadow-inner"
          >
            <label className="block text-center text-sm font-semibold">
              <span className="break-words">
                {game.team2[0].name} & {game.team2[1].name}
              </span>
            </label>
            <Input
              type="number"
              inputMode="numeric"
              pattern="[0-9]*"
              min="0"
              value={score2}
              onChange={(e) => setScore2(e.target.value)}
              placeholder="0"
              className="font-display mt-2 h-16 text-center text-5xl font-semibold tracking-tight"
            />
          </motion.div>
        </div>

        {/* Presets follow the session's rules — hardcoded 11s would trip the
            unusual-score nudge on the app's own suggestions when the organizer
            plays to 15 or 21, and every preset respects win-by. For 11/2 this
            yields the classic 11-0/5/7/9. Contradictory rules (win-by larger
            than points-to-win) produce no valid presets — hide the section
            rather than render an empty header. */}
        {quickScorePresets.length > 0 && (
          <div className="flex flex-col gap-2 border-t border-border/70 pt-4">
            <p className="text-center text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Quick scores
            </p>
            <div className="grid grid-cols-4 gap-2">
              {quickScorePresets.map(([s1, s2]) => (
                <TextureButton
                  key={`${s1}-${s2}`}
                  type="button"
                  variant="minimal"
                  size="sm"
                  onClick={() => {
                    setScore1(s1.toString());
                    setScore2(s2.toString());
                  }}
                  className="text-xs"
                >
                  {s1}-{s2}
                </TextureButton>
              ))}
            </div>
          </div>
        )}
        {isUnusualScore && (
          <p className="text-center text-xs font-medium text-warning">
            Heads up: a game to {pointsToWin}, win by {winBy} wouldn&apos;t
            usually end {s1Num}-{s2Num}. Double-check it — you can still save.
          </p>
        )}
      </div>
      <DialogFooter className="flex-col gap-2 sm:flex-row">
        <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
          Cancel
        </Button>
        <ShimmerButton
          type="button"
          onClick={handleSave}
          disabled={!score1 || !score2}
          borderRadius="0.5rem"
          background="linear-gradient(135deg, var(--primary), var(--accent))"
          shimmerColor="var(--live)"
          className="h-11 w-full px-5 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          Save score
        </ShimmerButton>
      </DialogFooter>
    </>
  );
}

interface ScoreSavedViewProps {
  team1: string;
  team2: string;
  s1: number;
  s2: number;
  reduceMotion: boolean;
}

function ScoreSavedView({ team1, team2, s1, s2, reduceMotion }: ScoreSavedViewProps) {
  const rows = [
    { name: team1, score: s1, won: s1 > s2 },
    { name: team2, score: s2, won: s2 > s1 },
  ];
  const winner = rows.find((r) => r.won);

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, scale: 0.97 }}
      animate={reduceMotion ? undefined : { opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center gap-5 py-6 text-center"
      aria-live="polite"
    >
      <div className="relative flex size-14 items-center justify-center">
        {!reduceMotion && (
          <motion.span
            className="absolute inset-0 rounded-full bg-live/30"
            initial={{ scale: 0.6, opacity: 0.7 }}
            animate={{ scale: 1.9, opacity: 0 }}
            transition={{ duration: 0.9, ease: "easeOut" }}
          />
        )}
        <motion.span
          className="relative flex size-14 items-center justify-center rounded-full bg-live text-live-foreground shadow-sm"
          initial={reduceMotion ? false : { scale: 0.5 }}
          animate={reduceMotion ? undefined : { scale: 1 }}
          transition={{ type: "spring", stiffness: 420, damping: 18 }}
        >
          <Check className="size-7" strokeWidth={2.5} />
        </motion.span>
      </div>

      <div className="w-full space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          Final
        </p>
        {rows.map((row, i) => (
          <div
            key={i}
            className={cn(
              "flex items-center justify-between gap-3 rounded-lg border px-3 py-2",
              row.won
                ? "border-live/45 bg-live/10"
                : "border-border/60 bg-background/50"
            )}
          >
            <span
              className={cn(
                "min-w-0 break-words text-left text-sm font-semibold",
                row.won ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {row.name}
            </span>
            <span
              className={cn(
                "font-display text-3xl font-semibold tabular-nums tracking-tight",
                row.won ? "text-success" : "text-muted-foreground"
              )}
            >
              {/* No count-up here: this view CONFIRMS what was saved, and a
                  mid-animation "7–7" under "Felix & Carla take it" read like
                  the app saved the wrong score. The check pulse is the beat. */}
              <NumberTicker value={row.score} />
            </span>
          </div>
        ))}
      </div>

      <p className="text-sm text-muted-foreground">
        {winner ? (
          <>
            <span className="font-semibold text-foreground">{winner.name}</span> take
            it. The next game is up.
          </>
        ) : (
          "Score saved. The next game is up."
        )}
      </p>
    </motion.div>
  );
}

// Court-movement chip: shown when a whole team came from the same court last
// round and moved together (always true for fixed-team formats).
function getTeamMovement(
  team: LocalPlayer[],
  currentCourt: number,
  previousRoundCourts: Map<string, number> | undefined
): "up" | "down" | null {
  if (!previousRoundCourts || previousRoundCourts.size === 0) return null;

  const fromCourts = team.map((p) => previousRoundCourts.get(p.id));
  if (fromCourts.some((c) => c === undefined)) return null;
  if (new Set(fromCourts).size !== 1) return null;

  const fromCourt = fromCourts[0]!;
  if (currentCourt < fromCourt) return "up";
  if (currentCourt > fromCourt) return "down";
  return null;
}

function TeamMovementChip({ movement }: { movement: "up" | "down" | null }) {
  if (!movement) return null;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide",
        movement === "up"
          ? "bg-success/15 text-success-strong"
          : "bg-muted text-muted-foreground"
      )}
    >
      {movement === "up" ? (
        <ArrowUp className="size-3" />
      ) : (
        <ArrowDown className="size-3" />
      )}
      <span aria-hidden="true">{movement}</span>
      <span className="sr-only">
        {movement === "up" ? "moved up a court" : "moved down a court"}
      </span>
    </span>
  );
}

// Game card component for displaying games in a list
interface GameCardProps {
  game: LocalRoundGame;
  courtWeight?: number;
  onScoreClick: (game: LocalRoundGame) => void;
  readOnly?: boolean;
  /** playerId -> court last round; enables the moved up/down chips. */
  previousRoundCourts?: Map<string, number>;
}

export function GameCard({
  game,
  courtWeight,
  onScoreClick,
  readOnly = false,
  previousRoundCourts,
}: GameCardProps) {
  const team1Movement = getTeamMovement(
    game.team1,
    game.courtNumber,
    previousRoundCourts
  );
  const team2Movement = getTeamMovement(
    game.team2,
    game.courtNumber,
    previousRoundCourts
  );
  const team1Won = game.completed && (game.team1Score ?? 0) > (game.team2Score ?? 0);
  const team2Won = game.completed && (game.team2Score ?? 0) > (game.team1Score ?? 0);

  return (
    <motion.button
      layout
      whileHover={readOnly ? undefined : { y: -2 }}
      whileTap={readOnly ? undefined : { scale: 0.985 }}
      onClick={() => onScoreClick(game)}
      disabled={readOnly}
      className={cn(
        "group relative isolate w-full overflow-hidden rounded-lg border p-3 text-left shadow-sm transition-colors disabled:opacity-100",
        readOnly && "cursor-default",
        game.completed
          ? "border-border/65 bg-card/80"
          : "border-primary/25 bg-background/75 hover:border-primary/70 hover:bg-card"
      )}
    >
      {!game.completed && !readOnly && (
        <ShineBorder
          borderWidth={1}
          duration={10}
          shineColor={["var(--primary)", "var(--live)", "var(--accent)"]}
        />
      )}

      <div className="relative z-10 flex items-center gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <span
              className={cn(
                "flex min-w-0 items-center gap-1.5 text-sm font-semibold",
                team1Won && "text-success"
              )}
            >
              {/* Wrap instead of clipping: spectators on phones must be able
                  to read both full names of a team. */}
              <span className="min-w-0 break-words leading-snug">
                {game.team1[0].name} & {game.team1[1].name}
              </span>
              <TeamMovementChip movement={team1Movement} />
            </span>
            {game.completed && (
              <span
                className={cn(
                  "font-display text-2xl font-semibold tabular-nums",
                  team1Won ? "text-success" : "text-muted-foreground"
                )}
              >
                <NumberTicker value={game.team1Score ?? 0} />
              </span>
            )}
          </div>

          <div className="flex items-center justify-between gap-2">
            <span
              className={cn(
                "flex min-w-0 items-center gap-1.5 text-sm font-semibold",
                team2Won && "text-success"
              )}
            >
              <span className="min-w-0 break-words leading-snug">
                {game.team2[0].name} & {game.team2[1].name}
              </span>
              <TeamMovementChip movement={team2Movement} />
            </span>
            {game.completed && (
              <span
                className={cn(
                  "font-display text-2xl font-semibold tabular-nums",
                  team2Won ? "text-success" : "text-muted-foreground"
                )}
              >
                <NumberTicker value={game.team2Score ?? 0} />
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <Badge variant={game.completed ? "secondary" : "outline"}>
            {game.completed ? "Final" : readOnly ? "Not played yet" : "Score"}
          </Badge>
          {/* Spectators can't tap — showing "Tap to enter" on their disabled
              cards contradicted the spectator-mode banner one card above. */}
          {!game.completed && !readOnly && (
            <span className="text-xs font-medium text-muted-foreground transition-colors group-hover:text-foreground sm:hidden">
              Tap to enter
            </span>
          )}
        </div>
      </div>

      {courtWeight && courtWeight > 1 && (
        <div className="relative z-10 mt-3 flex justify-end text-xs text-muted-foreground">
          <span className="data-chip">
            Top court — winner earns {courtWeight}x points
          </span>
        </div>
      )}
    </motion.button>
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
  /** playerId -> court in the previous round; enables moved up/down chips. */
  previousRoundCourts?: Map<string, number>;
  /** Older rounds collapse behind a tappable header to avoid a long scroll. */
  collapsible?: boolean;
  defaultOpen?: boolean;
}

export function RoundGamesList({
  games,
  roundNumber,
  courtWeights,
  byePlayers = [],
  onScoreClick,
  readOnly = false,
  previousRoundCourts,
  collapsible = false,
  defaultOpen = true,
}: RoundGamesListProps) {
  const [open, setOpen] = useState(defaultOpen);
  const roundGames = games.filter((g) => g.round === roundNumber);
  const completedCount = roundGames.filter((g) => g.completed).length;
  const roundComplete = completedCount === roundGames.length && roundGames.length > 0;
  const isOpen = collapsible ? open : true;

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
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          <button
            type="button"
            onClick={collapsible ? () => setOpen((v) => !v) : undefined}
            aria-expanded={collapsible ? isOpen : undefined}
            className={cn(
              "flex w-full items-center justify-between gap-3 text-left",
              collapsible && "cursor-pointer"
            )}
          >
            <span className="flex min-w-0 items-center gap-2">
              <span className="truncate">Round {roundNumber}</span>
              {roundComplete && (
                <Badge variant="secondary" className="text-xs">
                  Finished
                </Badge>
              )}
            </span>
            <span className="flex shrink-0 items-center gap-2">
              <Badge variant="outline">
                {completedCount}/{roundGames.length}
              </Badge>
              {collapsible && (
                <ChevronDown
                  className={cn(
                    "size-4 text-muted-foreground transition-transform",
                    isOpen && "rotate-180"
                  )}
                />
              )}
            </span>
          </button>
        </CardTitle>
        {isOpen && byePlayers.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-xs font-semibold text-muted-foreground">
              Sitting out
            </span>
            {byePlayers.map((p) => (
              <Badge key={p.id} variant="secondary" className="max-w-full text-xs">
                <span className="break-words">{p.name}</span>
              </Badge>
            ))}
          </div>
        )}
      </CardHeader>
      {isOpen && (
      <CardContent className="flex flex-col gap-4 pt-0">
        {courts.map((courtNumber) => (
          <motion.div
            key={courtNumber}
            layout
            className="flex flex-col gap-2 rounded-lg border border-border/55 bg-background/40 p-2"
          >
            {courts.length > 1 && (
              <div className="flex items-center justify-between gap-2 px-1">
                <div className="font-display text-sm font-semibold">
                  Court {courtNumber}
                </div>
                {courtWeights && courtWeights[courtNumber] && courtWeights[courtNumber] > 1 && (
                  <Badge variant="outline" className="text-xs">
                    {courtWeights[courtNumber]}x
                  </Badge>
                )}
              </div>
            )}

            <AnimatePresence initial={false} mode="popLayout">
              {gamesByCourt[courtNumber].map((game) => (
                <GameCard
                  key={game.id}
                  game={game}
                  courtWeight={courtWeights?.[courtNumber]}
                  onScoreClick={onScoreClick}
                  readOnly={readOnly}
                  previousRoundCourts={previousRoundCourts}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        ))}

        {roundGames.length === 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No games in this round
          </p>
        )}
      </CardContent>
      )}
    </Card>
  );
}

// MultiGameScoreEntry used to live here; it lost its last importer when the
// unused barrel files were deleted and was removed with them.
