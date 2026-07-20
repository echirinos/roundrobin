"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Armchair, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ShineBorder } from "@/components/ui/shine-border";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { TextureButton } from "@/components/ui/texture-button";
import type { LocalPlayer, LocalRoundGame, LocalStanding } from "@/src/types/database";
import type { EventSettings, ScoringType } from "@/src/types/formats";

// Plain-language scoring explanation for the round-control summary, instead of
// printing the raw setting ("court weighted", "win percentage").
function describeScoring(scoringType: ScoringType): string {
  switch (scoringType) {
    case "court_weighted":
      return "Scoring: higher courts are worth more — a win on Court 1 earns bonus points.";
    // "points" deliberately falls through to the default: sortStandings has
    // no dedicated points branch — it ranks by wins like the default. Copy
    // claiming margin-ranking here would be confidently wrong.
    case "games_won":
      return "Scoring: ranked by total games won.";
    case "win_percentage":
    default:
      // Matches sortStandings: wins first, win RATE only breaks ties. Saying
      // "share of games you win" here contradicted the standings footer.
      return "Scoring: ranked by wins — win rate breaks ties.";
  }
}
import {
  generateRound,
  type GeneratorContext,
} from "@/src/lib/formats/rotating-generators";
import {
  createTeamsFromRoster,
  derivePartnerships,
  generateFixedRound,
  getMaxManualByes,
  type Team,
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
  onRemoveRound?: (roundNumber: number) => void;
  /** Round 0 only: reopen the setup wizard before any round is confirmed. */
  onBackToSetup?: () => void;
  disabled?: boolean;
}

export function RoundManager({
  players,
  games,
  standings,
  settings,
  currentRound,
  onGenerateRound,
  onRemoveRound,
  onBackToSetup,
  disabled = false,
}: RoundManagerProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewGames, setPreviewGames] = useState<LocalRoundGame[] | null>(null);
  const [previewByePlayers, setPreviewByePlayers] = useState<LocalPlayer[]>([]);
  const [showUndoConfirm, setShowUndoConfirm] = useState(false);
  const [showByePicker, setShowByePicker] = useState(false);
  // Team Gauntlet: teams the organizer benched for the previewed round. The
  // draw regenerates around them, so this lives outside previewGames.
  const [manualByeTeamIds, setManualByeTeamIds] = useState<string[]>([]);
  // Bye teams from the last fixed-format draw, benched-first. Lets the gauntlet
  // preview tell the organizer's picks apart from byes the draw forced (odd
  // team count / courts full).
  const [previewByeTeams, setPreviewByeTeams] = useState<Team[]>([]);
  // The generator legitimately returns zero games once a format exhausts its
  // matchups (e.g. Team League after every pairing has played). An empty-but-
  // truthy preview used to hide every control with no way back.
  const [emptyDrawNotice, setEmptyDrawNotice] = useState(false);

  const isFixedPartners =
    settings.partnerMode === "fixed" || isFixedPartnerFormat(settings.format);
  const isGauntlet = settings.format === "team_gauntlet";

  // Roster-aware teams for fixed formats: a late arrival without a partner
  // waits on the bench instead of blocking round generation.
  const rosterTeams = useMemo(
    () =>
      isFixedPartners
        ? createTeamsFromRoster(players)
        : { teams: [], waitingPlayers: [] },
    [isFixedPartners, players]
  );
  const waitingPlayers = rosterTeams.waitingPlayers;
  // Unpaired players the organizer never explicitly linked. All but a trailing
  // odd one (who waits) get auto-teamed in add order — surface that so the
  // pairing is never a surprise (e.g. after breaking up a just-added team).
  const autoPairedPlayers = useMemo(() => {
    if (!isFixedPartners) return [];
    const pool = derivePartnerships(players).pool;
    return pool.slice(0, pool.length - waitingPlayers.length);
  }, [isFixedPartners, players, waitingPlayers.length]);

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

  // A double-tap on Confirm lands both clicks in the same tick, before React
  // clears previewGames — the second commit would duplicate the round with
  // IDENTICAL game ids (scoring one card then completes both copies). State
  // can't guard this synchronously; a ref can.
  const confirmedRef = useRef(false);

  // Every way out of a preview clears the same state; one helper so no exit
  // path can leave stale bench picks or picker UI behind.
  const resetPreview = ({ emptyDraw = false } = {}) => {
    setPreviewGames(null);
    setPreviewByePlayers([]);
    setPreviewByeTeams([]);
    setShowByePicker(false);
    setManualByeTeamIds([]);
    setEmptyDrawNotice(emptyDraw);
  };

  // byeIds is passed explicitly (not read from state) so a bench toggle can
  // regenerate in the same tick it updates the selection.
  const generatePreviewRound = (byeIds: string[]) => {
    setEmptyDrawNotice(false);
    confirmedRef.current = false;

    if (isFixedPartners) {
      const result = generateFixedRound({
        teams: rosterTeams.teams,
        existingGames: games,
        currentRound: currentRound + 1,
        settings,
        manualByeTeamIds: isGauntlet ? byeIds : undefined,
      });
      if (result.games.length === 0) {
        resetPreview({ emptyDraw: true });
        return;
      }
      setPreviewGames(result.games);
      setPreviewByePlayers(result.byeTeams.flatMap((team) => team.players));
      setPreviewByeTeams(result.byeTeams);
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

    if (result.games.length === 0) {
      resetPreview({ emptyDraw: true });
      return;
    }
    setPreviewGames(result.games);
    setPreviewByePlayers(result.byePlayers);
    setPreviewByeTeams([]);
  };

  const handleGenerateRound = () => {
    setIsGenerating(true);

    // Benching is a per-round call — every fresh preview starts automatic.
    setManualByeTeamIds([]);
    try {
      generatePreviewRound([]);
    } catch (error) {
      console.error("Failed to generate round:", error);
    }

    setIsGenerating(false);
  };

  const handleConfirmRound = () => {
    if (confirmedRef.current) return;
    if (previewGames && previewGames.length > 0) {
      confirmedRef.current = true;
      onGenerateRound(previewGames);
      resetPreview();
    }
  };

  const handleCancelPreview = () => {
    resetPreview();
  };

  const handleShufflePreview = () => {
    if (!previewGames) return;

    setShowByePicker(false);
    try {
      generatePreviewRound(manualByeTeamIds);
    } catch (error) {
      console.error("Failed to shuffle round preview:", error);
    }
  };

  // Shared with the generator so a pick the UI allows can never be a silent
  // no-op in the draw.
  const maxManualByes = getMaxManualByes(rosterTeams.teams.length);

  // Gauntlet bye picker: toggle a team on/off the bench and redraw the round
  // around the new selection immediately.
  const toggleManualBye = (teamId: string) => {
    const next = manualByeTeamIds.includes(teamId)
      ? manualByeTeamIds.filter((id) => id !== teamId)
      : [...manualByeTeamIds, teamId];
    if (next.length > maxManualByes) return;

    setManualByeTeamIds(next);
    try {
      generatePreviewRound(next);
    } catch (error) {
      console.error("Failed to redraw round with benched teams:", error);
    }
  };

  const clearManualByes = () => {
    setManualByeTeamIds([]);
    try {
      generatePreviewRound([]);
    } catch (error) {
      console.error("Failed to redraw round after clearing bench:", error);
    }
  };

  // Team Gauntlet seeds from results: correcting a score below an open
  // preview silently invalidates the draw on screen. Redraw (keeping the
  // organizer's bench picks) whenever the games list changes under an open
  // gauntlet preview. Other formats don't seed from records, so their
  // previews stay put.
  const lastGamesRef = useRef(games);
  useEffect(() => {
    const gamesChanged = lastGamesRef.current !== games;
    lastGamesRef.current = games;
    if (!gamesChanged || !isGauntlet || !previewGames) return;
    try {
      generatePreviewRound(manualByeTeamIds);
    } catch (error) {
      console.error("Failed to redraw preview after score change:", error);
    }
    // Intentionally games-only: the ref gate makes re-runs no-ops, and the
    // other values are read from the same render that saw games change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [games]);

  // Players on the bench because the ORGANIZER chose it — highlighted so
  // they're distinguishable from byes the draw forced on its own.
  const manualByePlayerIds = new Set(
    rosterTeams.teams
      .filter((t) => manualByeTeamIds.includes(t.id))
      .flatMap((t) => t.players.map((p) => p.id))
  );
  // Draw-forced byes that appeared ON TOP of the organizer's picks (odd team
  // count or courts full). Only worth explaining when both kinds coexist —
  // auto-only byes are the familiar default.
  const forcedExtraByeTeams =
    isGauntlet && manualByeTeamIds.length > 0
      ? previewByeTeams.filter((t) => !manualByeTeamIds.includes(t.id))
      : [];

  // Manually hand the bye to a chosen team: it takes the bench and the team
  // currently sitting out steps into the court it vacated. A 1-for-1 swap, so
  // court count and everyone else's matchups stay put.
  const benchChosenTeam = (gameId: string, side: "team1" | "team2") => {
    if (!previewGames || previewByePlayers.length < 2) return;

    const incoming = previewByePlayers.slice(0, 2);
    const restByes = previewByePlayers.slice(2);
    const targetGame = previewGames.find((g) => g.id === gameId);
    if (!targetGame) return;
    const outgoing = targetGame[side];

    setPreviewGames(
      previewGames.map((g) =>
        g.id === gameId ? { ...g, [side]: incoming } : g
      )
    );
    setPreviewByePlayers([...outgoing, ...restByes]);
    setShowByePicker(false);
  };

  const currentRoundScoredCount = currentRoundGames.filter(
    (g) => g.completed
  ).length;

  const handleConfirmUndoRound = () => {
    setShowUndoConfirm(false);
    // Defensive: the undo button only renders when no preview is open, but a
    // stale preview after removal would commit games seeded from a dead round.
    resetPreview();
    onRemoveRound?.(currentRound);
  };

  const canAddBeforeComplete = ["popcorn", "round_robin", "shuffle"].includes(
    settings.format
  );
  const hasReachedRoundLimit =
    typeof settings.maxRounds === "number" &&
    settings.maxRounds > 0 &&
    currentRound >= settings.maxRounds;
  // Fixed formats need two full teams to make a game; a lone unpaired late
  // arrival waits on the bench and must NOT block the next round.
  const hasValidPlayerCount = isFixedPartners
    ? rosterTeams.teams.length >= 2
    : players.length >= 4;
  const canGenerateNextRound =
    hasValidPlayerCount &&
    !hasReachedRoundLimit &&
    (currentRound === 0 || currentRoundComplete || canAddBeforeComplete);

  // Fresh-from-wizard sessions arrive here at round 0 with no games: draw the
  // Round 1 preview immediately so the wizard's "Start Round 1" flows straight
  // into the review card (bye picker included) without an extra tap. Runs at
  // most once per mount; a canceled preview stays canceled.
  const autoPreviewedRef = useRef(false);
  useEffect(() => {
    if (autoPreviewedRef.current || disabled) return;
    if (currentRound !== 0 || games.length > 0 || previewGames) return;
    if (!canGenerateNextRound) return;
    autoPreviewedRef.current = true;
    handleGenerateRound();
    // handleGenerateRound isn't memoized; the guards above make re-runs no-ops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRound, games.length, disabled, canGenerateNextRound]);

  // The card leads with what the organizer should do NEXT. While games are
  // unscored, the job is scoring (the big button used to push "Generate Round
  // 2" even then, steering people to skip scores); once the round is fully
  // scored, starting the next round becomes the one big action.
  const roundTitle =
    currentRound === 0
      ? "Start your first round"
      : currentRoundComplete
      ? `Round ${currentRound} is in the books`
      : `Round ${currentRound} in progress`;
  // Whether the preview actually renders a "Choose who sits" control — the
  // hint must never point at a control that isn't there.
  const canChooseSitters = isGauntlet
    ? maxManualByes > 0
    : previewByePlayers.length >= 2;
  const roundHint =
    currentRound === 0
      ? previewGames
        ? canChooseSitters
          ? "Check the matchups below — change who sits, then confirm."
          : "Check the matchups below, then confirm to go live."
        : `${players.length} players ready — matchups are drawn for you.`
      : currentRoundComplete
      ? "All scores are in. Nice one."
      : "Tap a court card below to enter scores.";
  const showPrimaryGenerate =
    currentRound === 0 || (currentRoundComplete && !hasReachedRoundLimit);
  const showEarlyGenerate =
    !showPrimaryGenerate &&
    hasGamesInProgress &&
    canAddBeforeComplete &&
    !hasReachedRoundLimit;

  return (
    <div className="flex flex-col gap-4">
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base">{roundTitle}</CardTitle>
            {currentRound > 0 && (
              <Badge variant={currentRoundComplete ? "default" : "secondary"}>
                {currentRoundScoredCount}/{currentRoundGames.length} scored
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">{roundHint}</p>

          {!previewGames && showPrimaryGenerate && (
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
                ? "Drawing matchups..."
                : `Start Round ${currentRound + 1}`}
            </ShimmerButton>
          )}

          {/* Ghost styling on purpose: this escape hatch must never look more
              important than the real task (scoring the courts below). */}
          {!previewGames && showEarlyGenerate && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleGenerateRound}
              disabled={disabled || !canGenerateNextRound || isGenerating}
              className="w-full text-muted-foreground"
            >
              {isGenerating
                ? "Drawing matchups..."
                : `Start Round ${currentRound + 1} without waiting`}
            </Button>
          )}

          {!previewGames &&
            !showPrimaryGenerate &&
            !showEarlyGenerate &&
            hasGamesInProgress &&
            !hasReachedRoundLimit && (
              <p className="text-sm font-medium text-muted-foreground">
                Score all games to unlock Round {currentRound + 1}.
              </p>
            )}

          {/* Round 0 = nothing committed yet, so going back to setup is
              lossless. Without this, a wrong format spotted in the first
              draw could only be fixed via destructive Reset. */}
          {currentRound === 0 && onBackToSetup && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onBackToSetup}
              disabled={disabled}
              className="w-full text-muted-foreground"
              data-testid="back-to-setup"
            >
              <Undo2 />
              Back to setup — edit players or format
            </Button>
          )}

          {!previewGames && currentRound >= 1 && onRemoveRound && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowUndoConfirm(true)}
              disabled={disabled}
              className="w-full text-muted-foreground hover:text-destructive"
              data-testid="undo-round"
            >
              <Undo2 />
              Undo Round {currentRound} & redraw matchups
            </Button>
          )}

          {emptyDrawNotice && (
            <p className="text-sm font-medium text-muted-foreground">
              No new matchups left to draw — this format has played every
              combination it can with the current roster.
            </p>
          )}

          {players.length < 4 && (
            <p className="text-sm font-medium text-warning">
              Need at least 4 players to start.
            </p>
          )}
          {isFixedPartners && autoPairedPlayers.length >= 2 && (
            <p className="text-sm font-medium text-muted-foreground">
              {autoPairedPlayers.map((p) => p.name).join(", ")} aren&apos;t
              paired, so they&apos;ll be teamed up automatically next round. Pair
              them yourself in the Players tab to choose partners.
            </p>
          )}
          {isFixedPartners && waitingPlayers.length > 0 && (
            <p className="text-sm font-medium text-muted-foreground">
              {waitingPlayers.map((p) => p.name).join(", ")} is waiting for a
              partner and sits out until one joins. Rounds keep running — pair
              them anytime in the Players tab.
            </p>
          )}

          {hasReachedRoundLimit && (
            <p className="text-sm font-medium text-muted-foreground">
              {currentRoundComplete
                ? `All ${settings.maxRounds} planned rounds are done.`
                : `All ${settings.maxRounds} planned rounds are drawn — score the last games to wrap up.`}
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
                    <div className="flex items-center gap-3">
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="break-words text-sm font-semibold leading-snug">
                          {game.team1[0].name} & {game.team1[1].name}
                        </div>
                        <div className="break-words text-sm font-semibold leading-snug">
                          {game.team2[0].name} & {game.team2[1].name}
                        </div>
                      </div>
                      <span className="shrink-0 rounded-md bg-muted px-2 py-1 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                        vs
                      </span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {previewByePlayers.length > 0 ||
            waitingPlayers.length > 0 ||
            (isGauntlet && maxManualByes > 0) ? (
              <div
                className="flex flex-col gap-3 rounded-lg border border-border/70 bg-muted/30 p-3"
                data-testid="preview-byes"
              >
                <div className="flex flex-wrap items-center gap-2">
                  {previewByePlayers.length > 0 || waitingPlayers.length > 0 ? (
                    <span className="flex items-center gap-1.5 text-sm font-semibold">
                      <Armchair className="size-4 text-muted-foreground" />
                      Sitting out
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      Everyone plays this round — no byes.
                    </span>
                  )}
                  {previewByePlayers.map((p) => (
                    <Badge
                      key={p.id}
                      variant={
                        manualByePlayerIds.has(p.id) ? "default" : "secondary"
                      }
                      className="max-w-full"
                    >
                      <span className="break-words">{p.name}</span>
                    </Badge>
                  ))}
                  {waitingPlayers.map((p) => (
                    <Badge key={p.id} variant="outline" className="max-w-full">
                      <span className="break-words">{p.name} — needs a partner</span>
                    </Badge>
                  ))}
                  {(isGauntlet
                    ? maxManualByes > 0
                    : previewByePlayers.length >= 2) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="ml-auto h-8"
                      onClick={() => setShowByePicker((v) => !v)}
                      data-testid="toggle-bye-picker"
                    >
                      {showByePicker ? "Close" : "Choose who sits"}
                    </Button>
                  )}
                </div>

                {forcedExtraByeTeams.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {/* Always "sit": a team name reads as two people. */}
                    {forcedExtraByeTeams.map((t) => t.name).join(" and ")} also
                    sit this round —{" "}
                    {rosterTeams.teams.length - manualByeTeamIds.length}{" "}
                    teams can&apos;t all play on {settings.numberOfCourts}{" "}
                    {settings.numberOfCourts === 1 ? "court" : "courts"}.
                  </p>
                )}

                {showByePicker && isGauntlet && (
                  <div className="flex flex-col gap-2 border-t border-border/60 pt-3">
                    <p className="text-xs text-muted-foreground">
                      Bench up to{" "}
                      {maxManualByes === 1 ? "one team" : "two teams"} for this
                      round — the matchups redraw around them. Tap again to put
                      a team back in.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {rosterTeams.teams.map((team) => {
                        const benched = manualByeTeamIds.includes(team.id);
                        const atCap =
                          !benched &&
                          manualByeTeamIds.length >= maxManualByes;
                        return (
                          <Button
                            key={team.id}
                            type="button"
                            variant={benched ? "default" : "outline"}
                            size="sm"
                            disabled={atCap}
                            aria-pressed={benched}
                            className="h-auto max-w-full py-1.5 text-left"
                            onClick={() => toggleManualBye(team.id)}
                          >
                            {benched && <Armchair className="size-3.5" />}
                            <span className="break-words">{team.name}</span>
                          </Button>
                        );
                      })}
                    </div>
                    {manualByeTeamIds.length > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="self-start text-muted-foreground"
                        onClick={clearManualByes}
                      >
                        Clear — let the app decide
                      </Button>
                    )}
                  </div>
                )}

                {showByePicker && !isGauntlet && (
                  <div className="flex flex-col gap-2 border-t border-border/60 pt-3">
                    <p className="text-xs text-muted-foreground">
                      Tap a team to give them the bye — the team sitting out now
                      takes their spot.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {previewGames.flatMap((game) =>
                        (["team1", "team2"] as const).map((side) => (
                          <Button
                            key={`${game.id}-${side}`}
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-auto max-w-full py-1.5 text-left"
                            onClick={() => benchChosenTeam(game.id, side)}
                          >
                            <span className="break-words">
                              {game[side][0].name} &amp; {game[side][1].name}
                            </span>
                          </Button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Everyone plays this round — no byes.
              </p>
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
                Confirm Round {currentRound + 1}
              </ShimmerButton>
              <Button variant="outline" onClick={handleCancelPreview}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={showUndoConfirm}
        onOpenChange={setShowUndoConfirm}
        title={`Undo Round ${currentRound}?`}
        description={
          currentRoundScoredCount > 0
            ? `Round ${currentRound}'s matchups and its ${currentRoundScoredCount} entered ${
                currentRoundScoredCount === 1 ? "score" : "scores"
              } will be deleted. Earlier rounds keep their results.`
            : `Round ${currentRound}'s matchups will be discarded. You can generate a fresh round right after.`
        }
        confirmLabel="Undo round"
        cancelLabel="Keep round"
        onConfirm={handleConfirmUndoRound}
        confirmTestId="undo-round-confirm"
        cancelTestId="undo-round-cancel"
      />
    </div>
  );
}

// Compact "how this session works" reference. Lives at the BOTTOM of the
// Matches tab (see EnhancedSchedule) so it never competes with round control
// or the live games for prime screen space.
export function FormatSummaryCard({ settings }: { settings: EventSettings }) {
  const formatDefinition =
    FORMAT_DEFINITIONS[settings.format] ?? FORMAT_DEFINITIONS.popcorn;
  const isRotating = isRotatingFormat(settings.format);

  return (
    <Card className="bg-card/70">
      <CardContent className="pt-4">
        <div className="mb-2 flex items-center gap-2">
          <h4 className="font-display text-sm font-semibold">
            {formatDefinition.name}
          </h4>
          <Badge variant="outline" className="text-xs">
            {isRotating ? "Rotating partners" : "Set teams"}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {formatDefinition.description}
        </p>
        <div className="mt-2 flex flex-col gap-1 text-xs text-muted-foreground">
          <span>{describeScoring(settings.scoringType)}</span>
          <span>
            {settings.numberOfCourts}{" "}
            {settings.numberOfCourts === 1 ? "court" : "courts"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
