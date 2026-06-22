"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { LocalPlayer, LocalRoundGame, LocalStanding } from "@/src/types/database";
import type { EventSettings } from "@/src/types/formats";
import {
  generateRound,
  generatePopcornRound,
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
  onShuffleRound,
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

  const generatePreviewRound = (forceShuffle = false) => {
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

    const result =
      forceShuffle &&
      (settings.format === "popcorn" || settings.format === "round_robin")
        ? generatePopcornRound(context)
        : generateRound(context);

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
      generatePreviewRound(true);
    } catch (error) {
      console.error("Failed to shuffle round preview:", error);
    }
  };

  const canAddBeforeComplete = ["popcorn", "round_robin", "shuffle"].includes(
    settings.format
  );
  const hasValidPlayerCount = isFixedPartners
    ? players.length >= 4 && players.length % 2 === 0
    : players.length >= 4;
  const canGenerateNextRound =
    hasValidPlayerCount &&
    (currentRound === 0 || currentRoundComplete || canAddBeforeComplete);

  return (
    <div className="space-y-4">
      {/* Round Status */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Round Management</CardTitle>
            <Badge variant={currentRoundComplete ? "default" : "secondary"}>
              Round {currentRound || "Not Started"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Info */}
          <div className="text-sm text-muted-foreground">
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

          {/* Generate Button */}
          {!previewGames && (
            <Button
              onClick={handleGenerateRound}
              disabled={disabled || !canGenerateNextRound || isGenerating}
              className="w-full"
            >
              {isGenerating
                ? "Generating..."
                : currentRound === 0
                ? `Generate Round 1 (${formatDefinition.name})`
                : `Generate Round ${currentRound + 1}`}
            </Button>
          )}

          {/* Not enough players warning */}
          {players.length < 4 && (
            <p className="text-sm text-amber-600">Need at least 4 players to start.</p>
          )}
          {isFixedPartners && players.length % 2 !== 0 && (
            <p className="text-sm text-amber-600">
              Set partners needs complete two-player teams.
            </p>
          )}

          {/* Current round not complete warning */}
          {hasGamesInProgress && (
            <p className="text-sm text-amber-600">
              {canAddBeforeComplete
                ? `Round ${currentRound} still has pending scores. You can still add another casual round.`
                : `Complete all games in Round ${currentRound} before generating the next round.`}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Preview Card */}
      {previewGames && previewGames.length > 0 && (
        <Card className="border-primary">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Round {currentRound + 1} Preview</CardTitle>
              <div className="flex gap-2">
                {(settings.format === "popcorn" ||
                  settings.format === "round_robin" ||
                  settings.format === "shuffle") && (
                  <Button variant="outline" size="sm" onClick={handleShufflePreview}>
                    Shuffle
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Preview Games */}
            <div className="space-y-3">
              {previewGames.map((game, idx) => (
                <div
                  key={game.id}
                  className="p-3 bg-muted/50 rounded-lg border"
                >
                  <div className="text-xs text-muted-foreground mb-1">
                    Court {game.courtNumber}
                  </div>
                  <div className="space-y-1">
                    <div className="font-medium text-sm">
                      {game.team1[0].name} & {game.team1[1].name}
                    </div>
                    <div className="text-center text-xs text-muted-foreground">vs</div>
                    <div className="font-medium text-sm">
                      {game.team2[0].name} & {game.team2[1].name}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Bye Players */}
            {previewByePlayers.length > 0 && (
              <div className="text-sm">
                <span className="text-muted-foreground">Sitting out: </span>
                <span className="font-medium">
                  {previewByePlayers.map((p) => p.name).join(", ")}
                </span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button onClick={handleConfirmRound} className="flex-1">
                Confirm Round
              </Button>
              <Button variant="outline" onClick={handleCancelPreview}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Format Info */}
      <Card className="bg-muted/30">
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="text-sm font-medium">{formatDefinition.name}</h4>
            <Badge variant="outline" className="text-xs">
              {isRotating ? "Rotating Partners" : "Fixed Teams"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">{formatDefinition.description}</p>
          <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
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
        <div className="space-y-2">
          {roundGames.map((game) => (
            <div
              key={game.id}
              className={`p-2 rounded border ${
                game.completed ? "bg-muted/50 border-transparent" : "border-dashed"
              }`}
            >
              <div className="flex items-center justify-between text-sm">
                <div className="flex-1">
                  <span
                    className={
                      game.completed && (game.team1Score ?? 0) > (game.team2Score ?? 0)
                        ? "text-green-600 dark:text-green-400 font-medium"
                        : ""
                    }
                  >
                    {game.team1[0].name} & {game.team1[1].name}
                  </span>
                </div>
                {game.completed ? (
                  <div className="flex items-center gap-2 font-mono">
                    <span
                      className={
                        (game.team1Score ?? 0) > (game.team2Score ?? 0)
                          ? "text-green-600 dark:text-green-400 font-bold"
                          : "text-muted-foreground"
                      }
                    >
                      {game.team1Score}
                    </span>
                    <span className="text-muted-foreground">-</span>
                    <span
                      className={
                        (game.team2Score ?? 0) > (game.team1Score ?? 0)
                          ? "text-green-600 dark:text-green-400 font-bold"
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
                        ? "text-green-600 dark:text-green-400 font-medium"
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
