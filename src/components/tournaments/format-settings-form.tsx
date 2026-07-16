"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  FORMAT_DEFINITIONS,
  type EventFormat,
  type EventSettings,
  type FormatOptions,
  type ScoringType,
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

interface NumericSettingInputProps {
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  fallback: number;
  ariaLabel: string;
  disabled?: boolean;
  className?: string;
  mode?: "integer" | "decimal";
}

function clampNumber(value: number, min?: number, max?: number): number {
  let nextValue = value;

  if (typeof min === "number") {
    nextValue = Math.max(min, nextValue);
  }

  if (typeof max === "number") {
    nextValue = Math.min(max, nextValue);
  }

  return nextValue;
}

function normalizeNumericInput(value: string, mode: "integer" | "decimal") {
  if (mode === "integer") {
    return value.replace(/\D/g, "");
  }

  const cleaned = value.replace(/[^\d.]/g, "");
  const [whole, ...rest] = cleaned.split(".");

  return rest.length > 0 ? `${whole}.${rest.join("")}` : whole;
}

function NumericSettingInput({
  value,
  onValueChange,
  min,
  max,
  step,
  fallback,
  ariaLabel,
  disabled,
  className = "h-11 w-24",
  mode = "integer",
}: NumericSettingInputProps) {
  const [draftValue, setDraftValue] = useState<string | null>(null);
  const visibleValue = draftValue ?? value.toString();

  const parseValue = (nextValue: string) => {
    const parsed =
      mode === "decimal"
        ? Number.parseFloat(nextValue)
        : Number.parseInt(nextValue, 10);

    if (Number.isNaN(parsed)) return null;

    return clampNumber(parsed, min, max);
  };

  const handleChange = (nextValue: string) => {
    const normalizedValue = normalizeNumericInput(nextValue, mode);

    setDraftValue(normalizedValue);

    if (!normalizedValue || normalizedValue === ".") return;

    const parsedValue = parseValue(normalizedValue);

    if (parsedValue !== null) {
      onValueChange(parsedValue);
    }
  };

  const handleBlur = () => {
    const parsedValue = draftValue ? parseValue(draftValue) : null;

    setDraftValue(null);

    if (parsedValue !== null) {
      onValueChange(parsedValue);
      return;
    }

    if (draftValue === "") {
      onValueChange(clampNumber(fallback, min, max));
    }
  };

  return (
    <Input
      type="text"
      inputMode={mode === "decimal" ? "decimal" : "numeric"}
      pattern={mode === "decimal" ? "[0-9.]*" : "[0-9]*"}
      min={min}
      max={max}
      step={step}
      aria-label={ariaLabel}
      value={visibleValue}
      onChange={(event) => handleChange(event.target.value)}
      onFocus={() => setDraftValue(value.toString())}
      onBlur={handleBlur}
      disabled={disabled}
      className={className}
    />
  );
}

// Shared field scaffold so every Advanced control reads the same way:
// sentence-case label, optional muted hint, control, optional helper line.
function SettingField({
  label,
  hint,
  helper,
  children,
}: {
  label: string;
  hint?: string;
  helper?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium">
        {label}
        {hint && (
          <span className="ml-1 font-normal text-muted-foreground">
            ({hint})
          </span>
        )}
      </label>
      {children}
      {helper && <p className="text-xs text-muted-foreground">{helper}</p>}
    </div>
  );
}

// Native <select> styled to match the app's inputs — native pickers are the
// friendliest control on phones, they just shouldn't look unstyled.
const SELECT_CLASS =
  "h-11 w-full rounded-lg border border-border/70 bg-background/60 px-3 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

const SCORING_SUMMARY: Record<ScoringType, string> = {
  win_percentage: "ranked by wins (win rate breaks ties)",
  // sortStandings has no dedicated points branch — it ranks by wins.
  points: "ranked by wins (win rate breaks ties)",
  games_won: "ranked by games won",
  court_weighted: "higher courts worth more points",
};

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

  const uniquePartnerRoundLimit = Math.max(1, playerCount - 1);
  const roundRobinTargetRounds =
    settings.maxRounds ?? Math.min(7, uniquePartnerRoundLimit);

  return (
    <div className="flex flex-col gap-4">
      {/* Basic settings. Court count is deliberately NOT here — the review
          step's stepper right above this form owns it, and having it twice
          meant the two controls could disagree on screen. */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Game rules</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {/* Games per round (if variable) */}
          {minGames !== maxGames && (
            <SettingField
              label="Games per round"
              hint={`${minGames}-${maxGames}`}
            >
              <NumericSettingInput
                ariaLabel="Games per round"
                min={minGames}
                max={maxGames}
                fallback={minGames}
                value={settings.gamesPerRound}
                onValueChange={(value) => updateSetting("gamesPerRound", value)}
                disabled={disabled}
              />
            </SettingField>
          )}

          {format === "round_robin" && (
            <SettingField
              label="Rounds to schedule"
              hint="unique partners first"
              helper={`With everyone playing each round, up to ${uniquePartnerRoundLimit} rounds can use a new partner before repeats.`}
            >
              <NumericSettingInput
                ariaLabel="Rounds to schedule"
                min={1}
                max={30}
                fallback={Math.min(7, uniquePartnerRoundLimit)}
                value={roundRobinTargetRounds}
                onValueChange={(value) => updateSetting("maxRounds", value)}
                disabled={disabled}
              />
            </SettingField>
          )}

          <div className="grid grid-cols-2 gap-4">
            <SettingField label="Points to win">
              <NumericSettingInput
                ariaLabel="Points to win"
                min={1}
                max={21}
                fallback={11}
                value={settings.pointsToWin}
                onValueChange={(value) => updateSetting("pointsToWin", value)}
                disabled={disabled}
              />
            </SettingField>
            <SettingField label="Win by">
              <NumericSettingInput
                ariaLabel="Win by"
                min={1}
                max={Math.min(5, settings.pointsToWin)}
                fallback={2}
                value={settings.winBy}
                onValueChange={(value) => updateSetting("winBy", value)}
                disabled={disabled}
              />
            </SettingField>
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
              <CardTitle className="text-base">Court optimizer</CardTitle>
              <Badge variant="outline" className="text-xs">Optional</Badge>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={settings.courtOptimizer.enabled}
                onChange={(e) =>
                  updateSetting("courtOptimizer", {
                    ...settings.courtOptimizer,
                    enabled: e.target.checked,
                  })
                }
                disabled={disabled}
                className="size-5 shrink-0 rounded accent-primary"
              />
              Enable court optimizer
            </label>

            {settings.courtOptimizer.enabled && (
              <div className="flex flex-col gap-1 pl-6">
                <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={settings.courtOptimizer.minimizeIdleTime}
                    onChange={(e) =>
                      updateSetting("courtOptimizer", {
                        ...settings.courtOptimizer,
                        minimizeIdleTime: e.target.checked,
                      })
                    }
                    disabled={disabled}
                    className="size-5 shrink-0 rounded accent-primary"
                  />
                  Minimize idle time between games
                </label>

                <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={settings.courtOptimizer.balancePlaytime}
                    onChange={(e) =>
                      updateSetting("courtOptimizer", {
                        ...settings.courtOptimizer,
                        balancePlaytime: e.target.checked,
                      })
                    }
                    disabled={disabled}
                    className="size-5 shrink-0 rounded accent-primary"
                  />
                  Balance playtime across all players
                </label>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Summary — one readable sentence, no raw setting values. */}
      <Card className="bg-muted/50">
        <CardContent className="pt-4">
          <h4 className="mb-1 text-sm font-medium">Your setup</h4>
          <p className="text-sm leading-6 text-muted-foreground">
            {definition.name} on {settings.numberOfCourts}{" "}
            {settings.numberOfCourts === 1 ? "court" : "courts"} with{" "}
            {settings.partnerMode === "fixed"
              ? "set teams"
              : "rotating partners"}
            . Games to {settings.pointsToWin}, win by {settings.winBy};{" "}
            {SCORING_SUMMARY[settings.scoringType]}.
          </p>
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
            <CardTitle className="text-base">Pool play options</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SettingField label="Number of pools">
                <NumericSettingInput
                  ariaLabel="Number of pools"
                  min={2}
                  max={8}
                  fallback={2}
                  value={settings.formatOptions.poolCount ?? 2}
                  onValueChange={(value) => updateFormatOption("poolCount", value)}
                  disabled={disabled}
                />
              </SettingField>
              <SettingField label="Advance from pool">
                <NumericSettingInput
                  ariaLabel="Advance from pool"
                  min={1}
                  max={4}
                  fallback={2}
                  value={settings.formatOptions.advanceFromPool ?? 2}
                  onValueChange={(value) =>
                    updateFormatOption("advanceFromPool", value)
                  }
                  disabled={disabled}
                />
              </SettingField>
            </div>
            <SettingField label="Playoff format">
              <select
                aria-label="Playoff format"
                value={settings.formatOptions.playoffFormat ?? "single_elimination"}
                onChange={(e) =>
                  updateFormatOption("playoffFormat", e.target.value as "single_elimination" | "double_elimination")
                }
                disabled={disabled}
                className={SELECT_CLASS}
              >
                <option value="single_elimination">Single elimination</option>
                <option value="double_elimination">Double elimination</option>
              </select>
            </SettingField>
          </CardContent>
        </Card>
      );

    case "bracket":
      return (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Bracket options</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={settings.formatOptions.consolationBracket ?? false}
                onChange={(e) => updateFormatOption("consolationBracket", e.target.checked)}
                disabled={disabled}
                className="size-5 shrink-0 rounded accent-primary"
              />
              Include consolation bracket for first-round losers
            </label>
            <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={settings.formatOptions.thirdPlaceMatch ?? false}
                onChange={(e) => updateFormatOption("thirdPlaceMatch", e.target.checked)}
                disabled={disabled}
                className="size-5 shrink-0 rounded accent-primary"
              />
              Include third place match
            </label>
          </CardContent>
        </Card>
      );

    case "mixed_madness":
      return (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Mixed Madness options</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <SettingField label="Gender balance">
              <select
                aria-label="Gender balance"
                value={settings.formatOptions.genderBalanceMode ?? "strict"}
                onChange={(e) =>
                  updateFormatOption("genderBalanceMode", e.target.value as "strict" | "flexible" | "none")
                }
                disabled={disabled}
                className={SELECT_CLASS}
              >
                <option value="strict">Strict (all teams must be mixed)</option>
                <option value="flexible">Flexible (try to balance, allow same-gender if needed)</option>
                <option value="none">None (no gender requirements)</option>
              </select>
            </SettingField>
          </CardContent>
        </Card>
      );

    case "scramble":
      return (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Scramble options</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <SettingField label="Players per court group">
              <select
                aria-label="Players per court group"
                value={settings.formatOptions.playersPerGroup ?? 4}
                onChange={(e) => updateFormatOption("playersPerGroup", parseInt(e.target.value))}
                disabled={disabled}
                className={SELECT_CLASS}
              >
                <option value={4}>4 players (no rotation within group)</option>
                <option value={5}>5 players (1 sits out per game)</option>
              </select>
            </SettingField>
          </CardContent>
        </Card>
      );

    case "cream_crop":
      return (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Cream of the Crop options</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SettingField
                label="Sorting rounds"
                helper="Random rounds to sort players by skill"
              >
                <NumericSettingInput
                  ariaLabel="Sorting rounds"
                  min={1}
                  max={5}
                  fallback={3}
                  value={settings.formatOptions.sortingRounds ?? 3}
                  onValueChange={(value) =>
                    updateFormatOption("sortingRounds", value)
                  }
                  disabled={disabled}
                />
              </SettingField>
              <SettingField label="Competition rounds" helper="Rounds after players are assigned to courts">
                <NumericSettingInput
                  ariaLabel="Competition rounds"
                  min={1}
                  max={10}
                  fallback={5}
                  value={settings.formatOptions.competitionRounds ?? 5}
                  onValueChange={(value) =>
                    updateFormatOption("competitionRounds", value)
                  }
                  disabled={disabled}
                />
              </SettingField>
            </div>
          </CardContent>
        </Card>
      );

    case "double_header":
      return (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Double Header options</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <SettingField label="Games per partnership" helper="Number of games before partners rotate">
              <NumericSettingInput
                ariaLabel="Games per partnership"
                min={2}
                max={4}
                fallback={2}
                value={settings.formatOptions.gamesPerPartnership ?? 2}
                onValueChange={(value) =>
                  updateFormatOption("gamesPerPartnership", value)
                }
                disabled={disabled}
              />
            </SettingField>
          </CardContent>
        </Card>
      );

    case "king_of_court":
    case "claim_throne":
      return (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {format === "king_of_court" ? "King of the Court" : "Claim the Throne"} options
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <SettingField label="King court bonus" helper="Point multiplier for wins on the king court">
              <NumericSettingInput
                ariaLabel="King court bonus"
                min={1}
                max={3}
                step={0.1}
                fallback={1.5}
                mode="decimal"
                value={settings.formatOptions.kingCourtBonus ?? 1.5}
                onValueChange={(value) =>
                  updateFormatOption("kingCourtBonus", value)
                }
                disabled={disabled}
              />
            </SettingField>
          </CardContent>
        </Card>
      );

    case "up_down_river":
      return (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Up & Down the River options</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SettingField label="Players moving up">
                <NumericSettingInput
                  ariaLabel="Players moving up"
                  min={1}
                  max={2}
                  fallback={2}
                  value={settings.formatOptions.playersMovingUp ?? 2}
                  onValueChange={(value) =>
                    updateFormatOption("playersMovingUp", value)
                  }
                  disabled={disabled}
                />
              </SettingField>
              <SettingField label="Players moving down">
                <NumericSettingInput
                  ariaLabel="Players moving down"
                  min={1}
                  max={2}
                  fallback={2}
                  value={settings.formatOptions.playersMovingDown ?? 2}
                  onValueChange={(value) =>
                    updateFormatOption("playersMovingDown", value)
                  }
                  disabled={disabled}
                />
              </SettingField>
            </div>
          </CardContent>
        </Card>
      );

    case "milp":
      return (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Team League options</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <SettingField label="Matches per opponent" helper="How many times each team plays every other team">
              <NumericSettingInput
                ariaLabel="Matches per opponent"
                min={1}
                max={3}
                fallback={1}
                value={settings.formatOptions.matchesPerOpponent ?? 1}
                onValueChange={(value) =>
                  updateFormatOption("matchesPerOpponent", value)
                }
                disabled={disabled}
              />
            </SettingField>
          </CardContent>
        </Card>
      );

    default:
      return null;
  }
}
