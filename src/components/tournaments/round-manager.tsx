"use client";

import { useState, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShineBorder } from "@/components/ui/shine-border";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { TextureButton } from "@/components/ui/texture-button";
import { cn } from "@/lib/utils";
import type { LocalPlayer, LocalRoundGame, LocalStanding } from "@/src/types/database";
import type { EventSettings } from "@/src/types/formats";
import {
  generateRound,
  type GeneratorContext,
} from "@/src/lib/formats/rotating-generators";
import {
  createTeamsFromPlayers,
  generateFixedRound,
} from "@/src/lib/formats/fixed-generators";
import {
  FORMAT_DEFINITIONS,
  isFixedPartnerFormat,
  isRotatingFormat,
} from "@/src/types/formats";

interface RoundManagerProps {
  players: LocalPlayer[];
  games: LocalRoundGame[];
  standings: LocalStanding[];
  settings: EventSettings;
  currentRound: number;
  onGenerateRound: (games: LocalRoundGame[]) => void;
  onShuffleRound?: (roundNumber: number) => void;
  disabled?: boolean;
}

export function RoundManager({
  players,
  games,
  standings,
  settings,
  currentRound,
  onGenerateRound,
  disabled = false,
}: RoundManagerProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewGames, setPreviewGames] = useState<LocalRoundGame[] | null>(null);
  const [previewByePlayers, setPreviewByePlayers] = useState<LocalPlayer[]>([]);

  const formatDefinition = FORMAT_DEFINITIONS[settings.format];
  const isRotating = isRotatingFormat(settings.format);
  const isFixedPartners =
    settings.partnerMode === "fixed" || isFixedPartnerFormat(settings.format);

  // Track used partnerships
  const usedPartnerships = useMemo(() => {
    const partnerships = new Set<string>();
    for (const game of games) {
      const p1 = [game.team1[0].id, game.team1[1].id].sort().join("-");
      const p2 = [game.team2[0].id, game.team2[1].id].sort().join("-");
      partnerships.add(p1);
      partnerships.add(p2);
    }
    return partnerships;
  }, [games]);

  // Get current round status
  const currentRoundGames = games.filter((g) => g.round === currentRound);
  const currentRoundComplete = currentRoundGames.length > 0 && currentRoundGames.every((g) => g.completed);
  const hasGamesInProgress = currentRoundGames.some((g) => !g.completed);

  const generatePreviewRound = () => {
    if (isFixedPartners) {
      const result = generateFixedRound({
        teams: createTeamsFromPlayers(players),
        existingGames: games,
        currentRound: currentRound + 1,
        settings,
      });
      setPreviewGames(result.games);
      setPreviewByePlayers(result.byeTeams.flatMap((team) => team.players));
      return;
    }

    const context: GeneratorContext = {
      players,
      existingGames: games,
      standings,
      currentRound: currentRound + 1,
      settings,
      usedPartnerships: new Set(usedPartnerships),
    };

    const result = generateRound(context);

    setPreviewGames(result.games);
    setPreviewByePlayers(result.byePlayers);
  };

  const handleGenerateRound = () => {
    setIsGenerating(true);

    try {
      generatePreviewRound();
    } catch (error) {
      console.error("Failed to generate round:", error);
    }

    setIsGenerating(false);
  };

  const handleConfirmRound = () => {
    if (previewGames && previewGames.length > 0) {
      onGenerateRound(previewGames);
      setPreviewGames(null);
      setPreviewByePlayers([]);
    }
  };

  const handleCancelPreview = () => {
    setPreviewGames(null);
    setPreviewByePlayers([]);
  };

  const handleShufflePreview = () => {
    if (!previewGames) return;

    try {
      generatePreviewRound();
    } catch (error) {
      console.error("Failed to shuffle round preview:", error);
    }
  };

  const canAddBeforeComplete = ["popcorn", "round_robin", "shuffle"].includes(
    settings.format
  );
  const hasReachedRoundLimit =
    typeof settings.maxRounds === "number" &&
    settings.maxRounds > 0 &&
    currentRound >= settings.maxRounds;
  const hasValidPlayerCount = isFixedPartners
    ? players.length >= 4 && players.length % 2 === 0
    : players.length >= 4;
  const canGenerateNextRound =
    hasValidPlayerCount &&
    !hasReachedRoundLimit &&
    (currentRound === 0 || currentRoundComplete || canAddBeforeComplete);

  return (
    <div className="flex flex-col gap-4">
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base">Round control</CardTitle>
            <Badge variant={currentRoundComplete ? "default" : "secondary"}>
              Round {currentRound || "Not Started"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="rounded-lg border border-border/70 bg-background/55 p-3 text-sm text-muted-foreground">
            {currentRound === 0 ? (
              <p>Ready to generate first round with {players.length} players.</p>
            ) : currentRoundComplete ? (
              <p>Round {currentRound} complete. Ready for next round.</p>
            ) : (
              <p>
                Round {currentRound} in progress: {currentRoundGames.filter((g) => g.completed).length}/
                {currentRoundGames.length} games completed
              </p>
            )}
          </div>

          {!previewGames && (
            <ShimmerButton
              type="button"
              onClick={handleGenerateRound}
              disabled={disabled || !canGenerateNextRound || isGenerating}
              borderRadius="0.5rem"
              background="linear-gradient(135deg, var(--primary), var(--accent))"
              shimmerColor="var(--live)"
              className="h-11 w-full px-5 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isGenerating
                ? "Generating..."
                : hasReachedRoundLimit
                ? `All ${settings.maxRounds} rounds generated`
                : currentRound === 0
                ? `Generate Round 1 (${formatDefinition.name})`
                : `Generate Round ${currentRound + 1}`}
            </ShimmerButton>
          )}

          {players.length < 4 && (
            <p className="text-sm font-medium text-warning">
              Need at least 4 players to start.
            </p>
          )}
          {isFixedPartners && players.length % 2 !== 0 && (
            <p className="text-sm font-medium text-warning">
              Set partners needs complete two-player teams.
            </p>
          )}

          {hasGamesInProgress && (
            <p className="text-sm font-medium text-warning">
              {canAddBeforeComplete
                ? `Round ${currentRound} still has pending scores. You can still add another casual round.`
                : `Complete all games in Round ${currentRound} before generating the next round.`}
            </p>
          )}
          {hasReachedRoundLimit && (
            <p className="text-sm font-medium text-muted-foreground">
              Planned {settings.maxRounds} rounds are already generated.
            </p>
          )}
        </CardContent>
      </Card>

      {previewGames && previewGames.length > 0 && (
        <Card className="relative overflow-hidden border-primary/55">
          <ShineBorder
            borderWidth={1}
            duration={12}
            shineColor={["var(--primary)", "var(--live)", "var(--accent)"]}
          />
          <CardHeader className="pb-2">
            <div className="relative z-10 flex items-center justify-between gap-3">
              <CardTitle className="text-base">
                Round {currentRound + 1} preview
              </CardTitle>
              <div className="flex gap-2">
                {(settings.format === "popcorn" ||
                  settings.format === "shuffle") && (
                  <TextureButton
                    type="button"
                    variant="minimal"
                    size="sm"
                    onClick={handleShufflePreview}
                  >
                    Shuffle
                  </TextureButton>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative z-10 flex flex-col gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <AnimatePresence initial={false} mode="popLayout">
                {previewGames.map((game, idx) => (
                  <motion.div
                    key={game.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ delay: idx * 0.03, duration: 0.25 }}
                    className="rounded-lg border border-border/70 bg-background/65 p-3 shadow-sm"
                  >
                    <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      Court {game.courtNumber}
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="truncate text-sm font-semibold">
                        {game.team1[0].name} & {game.team1[1].name}
                      </div>
                      <div className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        vs
                      </div>
                      <div className="truncate text-sm font-semibold">
                        {game.team2[0].name} & {game.team2[1].name}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {previewByePlayers.length > 0 && (
              <div className="text-sm">
                <span className="text-muted-foreground">Sitting out: </span>
                <span className="font-medium">
                  {previewByePlayers.map((p) => p.name).join(", ")}
                </span>
              </div>
            )}

            <div className="flex gap-2">
              <ShimmerButton
                type="button"
                onClick={handleConfirmRound}
                borderRadius="0.5rem"
                background="linear-gradient(135deg, var(--primary), var(--accent))"
                shimmerColor="var(--live)"
                className="h-11 flex-1 px-5 text-sm font-semibold text-primary-foreground"
              >
                Confirm Round
              </ShimmerButton>
              <Button variant="outline" onClick={handleCancelPreview}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-card/70">
        <CardContent className="pt-4">
          <div className="mb-2 flex items-center gap-2">
            <h4 className="font-display text-sm font-semibold">
              {formatDefinition.name}
            </h4>
            <Badge variant="outline" className="text-xs">
              {isRotating ? "Rotating Partners" : "Fixed Teams"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">{formatDefinition.description}</p>
          <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
            <span>Scoring: {settings.scoringType.replace("_", " ")}</span>
            <span>Courts: {settings.numberOfCourts}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Summary component for completed rounds
interface RoundSummaryProps {
  games: LocalRoundGame[];
  roundNumber: number;
}

export function RoundSummary({ games, roundNumber }: RoundSummaryProps) {
  const roundGames = games.filter((g) => g.round === roundNumber);
  const completedGames = roundGames.filter((g) => g.completed);

  if (roundGames.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Round {roundNumber}</CardTitle>
          <Badge variant={completedGames.length === roundGames.length ? "default" : "secondary"}>
            {completedGames.length}/{roundGames.length} Complete
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2">
          {roundGames.map((game) => (
            <div
              key={game.id}
              className={cn(
                "rounded-lg border p-2",
                game.completed
                  ? "border-border/60 bg-background/55"
                  : "border-dashed border-border/80"
              )}
            >
              <div className="flex items-center justify-between text-sm">
                <div className="flex-1">
                  <span
                    className={
                      game.completed && (game.team1Score ?? 0) > (game.team2Score ?? 0)
                        ? "font-medium text-success"
                        : ""
                    }
                  >
                    {game.team1[0].name} & {game.team1[1].name}
                  </span>
                </div>
                {game.completed ? (
                  <div className="font-data flex items-center gap-2">
                    <span
                      className={
                        (game.team1Score ?? 0) > (game.team2Score ?? 0)
                          ? "font-bold text-success"
                          : "text-muted-foreground"
                      }
                    >
                      {game.team1Score}
                    </span>
                    <span className="text-muted-foreground">-</span>
                    <span
                      className={
                        (game.team2Score ?? 0) > (game.team1Score ?? 0)
                          ? "font-bold text-success"
                          : "text-muted-foreground"
                      }
                    >
                      {game.team2Score}
                    </span>
                  </div>
                ) : (
                  <Badge variant="outline" className="text-xs">
                    Pending
                  </Badge>
                )}
                <div className="flex-1 text-right">
                  <span
                    className={
                      game.completed && (game.team2Score ?? 0) > (game.team1Score ?? 0)
                        ? "font-medium text-success"
                        : ""
                    }
                  >
                    {game.team2[0].name} & {game.team2[1].name}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
