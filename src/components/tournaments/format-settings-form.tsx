"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  FORMAT_DEFINITIONS,
  type EventFormat,
  type EventSettings,
  type FormatOptions,
  getGamesPerRoundRange,
  supportsCourtWeighting,
} from "@/src/types/formats";

interface FormatSettingsFormProps {
  format: EventFormat;
  settings: EventSettings;
  onSettingsChange: (settings: EventSettings) => void;
  playerCount: number;
  disabled?: boolean;
}

export function FormatSettingsForm({
  format,
  settings,
  onSettingsChange,
  playerCount,
  disabled = false,
}: FormatSettingsFormProps) {
  const definition = FORMAT_DEFINITIONS[format];
  const [minGames, maxGames] = getGamesPerRoundRange(format);
  const hasCourtWeighting = supportsCourtWeighting(format);

  const updateSetting = <K extends keyof EventSettings>(
    key: K,
    value: EventSettings[K]
  ) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  const updateFormatOption = <K extends keyof FormatOptions>(
    key: K,
    value: FormatOptions[K]
  ) => {
    onSettingsChange({
      ...settings,
      formatOptions: { ...settings.formatOptions, [key]: value },
    });
  };

  // Calculate recommended number of courts
  const recommendedCourts = Math.floor(playerCount / 4);
  const maxCourts = Math.max(1, Math.floor(playerCount / 4));

  return (
    <div className="space-y-4">
      {/* Basic Settings */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Game Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Number of Courts */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Courts in play
              <span className="text-muted-foreground font-normal ml-1">
                (max {maxCourts} for {playerCount} players)
              </span>
            </label>
            <Input
              type="number"
              min={1}
              max={maxCourts}
              value={settings.numberOfCourts}
              onChange={(e) =>
                updateSetting("numberOfCourts", Math.max(1, Math.min(maxCourts, parseInt(e.target.value) || 1)))
              }
              disabled={disabled}
              className="w-24"
            />
            {settings.numberOfCourts !== recommendedCourts && recommendedCourts > 0 && (
              <p className="text-xs text-amber-600">
                Recommended: {recommendedCourts} courts for optimal player rotation
              </p>
            )}
          </div>

          {/* Games Per Round (if variable) */}
          {minGames !== maxGames && (
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Games Per Round
                <span className="text-muted-foreground font-normal ml-1">
                  ({minGames}-{maxGames})
                </span>
              </label>
              <Input
                type="number"
                min={minGames}
                max={maxGames}
                value={settings.gamesPerRound}
                onChange={(e) =>
                  updateSetting("gamesPerRound", Math.max(minGames, Math.min(maxGames, parseInt(e.target.value) || minGames)))
                }
                disabled={disabled}
                className="w-24"
              />
            </div>
          )}

          {/* Points to Win */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Points to Win</label>
              <Input
                type="number"
                min={1}
                max={21}
                value={settings.pointsToWin}
                onChange={(e) => updateSetting("pointsToWin", parseInt(e.target.value) || 11)}
                disabled={disabled}
                className="w-24"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Win By</label>
              <Input
                type="number"
                min={1}
                max={5}
                value={settings.winBy}
                onChange={(e) => updateSetting("winBy", parseInt(e.target.value) || 2)}
                disabled={disabled}
                className="w-24"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Format-Specific Settings */}
      {renderFormatSpecificSettings(format, settings, updateFormatOption, disabled)}

      {/* Court Optimizer */}
      {hasCourtWeighting && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Court Optimizer</CardTitle>
              <Badge variant="outline" className="text-xs">Optional</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="optimizer-enabled"
                checked={settings.courtOptimizer.enabled}
                onChange={(e) =>
                  updateSetting("courtOptimizer", {
                    ...settings.courtOptimizer,
                    enabled: e.target.checked,
                  })
                }
                disabled={disabled}
                className="rounded"
              />
              <label htmlFor="optimizer-enabled" className="text-sm">
                Enable court optimizer
              </label>
            </div>

            {settings.courtOptimizer.enabled && (
              <div className="space-y-2 pl-6">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="minimize-idle"
                    checked={settings.courtOptimizer.minimizeIdleTime}
                    onChange={(e) =>
                      updateSetting("courtOptimizer", {
                        ...settings.courtOptimizer,
                        minimizeIdleTime: e.target.checked,
                      })
                    }
                    disabled={disabled}
                    className="rounded"
                  />
                  <label htmlFor="minimize-idle" className="text-sm">
                    Minimize idle time between games
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="balance-playtime"
                    checked={settings.courtOptimizer.balancePlaytime}
                    onChange={(e) =>
                      updateSetting("courtOptimizer", {
                        ...settings.courtOptimizer,
                        balancePlaytime: e.target.checked,
                      })
                    }
                    disabled={disabled}
                    className="rounded"
                  />
                  <label htmlFor="balance-playtime" className="text-sm">
                    Balance playtime across all players
                  </label>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      <Card className="bg-muted/50">
        <CardContent className="pt-4">
          <h4 className="text-sm font-medium mb-2">Settings Summary</h4>
          <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
            <div>Format: {definition.name}</div>
            <div>Courts: {settings.numberOfCourts}</div>
            <div>Games/Round: {settings.gamesPerRound}</div>
            <div>Play to {settings.pointsToWin}, win by {settings.winBy}</div>
            <div>Scoring: {settings.scoringType.replace("_", " ")}</div>
            <div>Partners: {settings.partnerMode}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function renderFormatSpecificSettings(
  format: EventFormat,
  settings: EventSettings,
  updateFormatOption: <K extends keyof FormatOptions>(key: K, value: FormatOptions[K]) => void,
  disabled: boolean
) {
  switch (format) {
    case "pool_play":
      return (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Pool Play Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Number of Pools</label>
                <Input
                  type="number"
                  min={2}
                  max={8}
                  value={settings.formatOptions.poolCount ?? 2}
                  onChange={(e) => updateFormatOption("poolCount", parseInt(e.target.value) || 2)}
                  disabled={disabled}
                  className="w-24"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Advance from Pool</label>
                <Input
                  type="number"
                  min={1}
                  max={4}
                  value={settings.formatOptions.advanceFromPool ?? 2}
                  onChange={(e) => updateFormatOption("advanceFromPool", parseInt(e.target.value) || 2)}
                  disabled={disabled}
                  className="w-24"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Playoff Format</label>
              <select
                value={settings.formatOptions.playoffFormat ?? "single_elimination"}
                onChange={(e) =>
                  updateFormatOption("playoffFormat", e.target.value as "single_elimination" | "double_elimination")
                }
                disabled={disabled}
                className="w-full px-3 py-2 border rounded-md bg-background text-sm"
              >
                <option value="single_elimination">Single Elimination</option>
                <option value="double_elimination">Double Elimination</option>
              </select>
            </div>
          </CardContent>
        </Card>
      );

    case "bracket":
      return (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Bracket Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="consolation-bracket"
                checked={settings.formatOptions.consolationBracket ?? false}
                onChange={(e) => updateFormatOption("consolationBracket", e.target.checked)}
                disabled={disabled}
                className="rounded"
              />
              <label htmlFor="consolation-bracket" className="text-sm">
                Include consolation bracket for first-round losers
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="third-place"
                checked={settings.formatOptions.thirdPlaceMatch ?? false}
                onChange={(e) => updateFormatOption("thirdPlaceMatch", e.target.checked)}
                disabled={disabled}
                className="rounded"
              />
              <label htmlFor="third-place" className="text-sm">
                Include third place match
              </label>
            </div>
          </CardContent>
        </Card>
      );

    case "mixed_madness":
      return (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Mixed Madness Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Gender Balance Mode</label>
              <select
                value={settings.formatOptions.genderBalanceMode ?? "strict"}
                onChange={(e) =>
                  updateFormatOption("genderBalanceMode", e.target.value as "strict" | "flexible" | "none")
                }
                disabled={disabled}
                className="w-full px-3 py-2 border rounded-md bg-background text-sm"
              >
                <option value="strict">Strict (all teams must be mixed)</option>
                <option value="flexible">Flexible (try to balance, allow same-gender if needed)</option>
                <option value="none">None (no gender requirements)</option>
              </select>
            </div>
          </CardContent>
        </Card>
      );

    case "scramble":
      return (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Scramble Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Players Per Court Group</label>
              <select
                value={settings.formatOptions.playersPerGroup ?? 4}
                onChange={(e) => updateFormatOption("playersPerGroup", parseInt(e.target.value))}
                disabled={disabled}
                className="w-full px-3 py-2 border rounded-md bg-background text-sm"
              >
                <option value={4}>4 players (no rotation within group)</option>
                <option value={5}>5 players (1 sits out per game)</option>
              </select>
            </div>
          </CardContent>
        </Card>
      );

    case "cream_crop":
      return (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Cream of the Crop Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Sorting Rounds</label>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  value={settings.formatOptions.sortingRounds ?? 3}
                  onChange={(e) => updateFormatOption("sortingRounds", parseInt(e.target.value) || 3)}
                  disabled={disabled}
                  className="w-24"
                />
                <p className="text-xs text-muted-foreground">
                  Random rounds to sort players by skill
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Competition Rounds</label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={settings.formatOptions.competitionRounds ?? 5}
                  onChange={(e) => updateFormatOption("competitionRounds", parseInt(e.target.value) || 5)}
                  disabled={disabled}
                  className="w-24"
                />
                <p className="text-xs text-muted-foreground">
                  Rounds after players are assigned to courts
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      );

    case "double_header":
      return (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Double Header Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Games Per Partnership</label>
              <Input
                type="number"
                min={2}
                max={4}
                value={settings.formatOptions.gamesPerPartnership ?? 2}
                onChange={(e) => updateFormatOption("gamesPerPartnership", parseInt(e.target.value) || 2)}
                disabled={disabled}
                className="w-24"
              />
              <p className="text-xs text-muted-foreground">
                Number of games before partners rotate
              </p>
            </div>
          </CardContent>
        </Card>
      );

    case "king_of_court":
    case "claim_throne":
      return (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {format === "king_of_court" ? "King of Court" : "Claim the Throne"} Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">King Court Bonus</label>
              <Input
                type="number"
                min={1}
                max={3}
                step={0.1}
                value={settings.formatOptions.kingCourtBonus ?? 1.5}
                onChange={(e) => updateFormatOption("kingCourtBonus", parseFloat(e.target.value) || 1.5)}
                disabled={disabled}
                className="w-24"
              />
              <p className="text-xs text-muted-foreground">
                Point multiplier for wins on the king court
              </p>
            </div>
          </CardContent>
        </Card>
      );

    case "up_down_river":
      return (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Up & Down the River Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Players Moving Up</label>
                <Input
                  type="number"
                  min={1}
                  max={2}
                  value={settings.formatOptions.playersMovingUp ?? 2}
                  onChange={(e) => updateFormatOption("playersMovingUp", parseInt(e.target.value) || 2)}
                  disabled={disabled}
                  className="w-24"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Players Moving Down</label>
                <Input
                  type="number"
                  min={1}
                  max={2}
                  value={settings.formatOptions.playersMovingDown ?? 2}
                  onChange={(e) => updateFormatOption("playersMovingDown", parseInt(e.target.value) || 2)}
                  disabled={disabled}
                  className="w-24"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      );

    case "milp":
      return (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">MiLP Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Matches Per Opponent</label>
              <Input
                type="number"
                min={1}
                max={3}
                value={settings.formatOptions.matchesPerOpponent ?? 1}
                onChange={(e) => updateFormatOption("matchesPerOpponent", parseInt(e.target.value) || 1)}
                disabled={disabled}
                className="w-24"
              />
              <p className="text-xs text-muted-foreground">
                How many times each team plays every other team
              </p>
            </div>
          </CardContent>
        </Card>
      );

    default:
      return null;
  }
}
