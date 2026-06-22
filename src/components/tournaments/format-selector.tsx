"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FORMAT_DEFINITIONS,
  FORMAT_CATEGORIES,
  type EventFormat,
  type FormatDefinition,
} from "@/src/types/formats";

interface FormatSelectorProps {
  selectedFormat: EventFormat;
  onFormatChange: (format: EventFormat) => void;
  disabled?: boolean;
}

export function FormatSelector({
  selectedFormat,
  onFormatChange,
  disabled = false,
}: FormatSelectorProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(
    FORMAT_DEFINITIONS[selectedFormat]?.category ?? "rotating"
  );

  const selectedDefinition = FORMAT_DEFINITIONS[selectedFormat];

  const toggleCategory = (categoryId: string) => {
    setExpandedCategory(expandedCategory === categoryId ? null : categoryId);
  };

  return (
    <div className="space-y-4">
      {/* Selected Format Display */}
      {selectedDefinition && (
        <Card className="border-primary">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{selectedDefinition.name}</CardTitle>
              <div className="flex gap-1">
                <Badge variant="secondary" className="text-xs">
                  {selectedDefinition.partnerMode === "rotating" ? "Rotating" : "Fixed"}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {selectedDefinition.category}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">
              {selectedDefinition.description}
            </p>
            <div className="flex flex-wrap gap-1">
              {selectedDefinition.keyFeatures.map((feature, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {feature}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Format Categories */}
      <div className="space-y-2">
        {FORMAT_CATEGORIES.map((category) => (
          <div key={category.id} className="border rounded-lg overflow-hidden">
            <button
              onClick={() => toggleCategory(category.id)}
              disabled={disabled}
              className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-muted/50 transition-colors disabled:opacity-50"
            >
              <div>
                <h3 className="font-medium">{category.name}</h3>
                <p className="text-xs text-muted-foreground">{category.description}</p>
              </div>
              <span className="text-muted-foreground">
                {expandedCategory === category.id ? "−" : "+"}
              </span>
            </button>

            {expandedCategory === category.id && (
              <div className="border-t bg-muted/20">
                {category.formats.map((formatId) => {
                  const format = FORMAT_DEFINITIONS[formatId as EventFormat];
                  if (!format) return null;

                  const isSelected = selectedFormat === formatId;

                  return (
                    <button
                      key={formatId}
                      onClick={() => onFormatChange(formatId as EventFormat)}
                      disabled={disabled}
                      className={`w-full px-4 py-3 text-left border-b last:border-b-0 transition-colors disabled:opacity-50 ${
                        isSelected
                          ? "bg-primary/10 border-l-2 border-l-primary"
                          : "hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{format.name}</span>
                            {isSelected && (
                              <Badge className="text-xs">Selected</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {format.description}
                          </p>
                        </div>
                        <div className="flex flex-col gap-1 shrink-0">
                          <Badge variant="outline" className="text-xs">
                            {format.scoringType === "court_weighted"
                              ? "Court Pts"
                              : format.scoringType === "win_percentage"
                              ? "Win %"
                              : "Games"}
                          </Badge>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Compact version for forms
interface FormatDropdownProps {
  selectedFormat: EventFormat;
  onFormatChange: (format: EventFormat) => void;
  disabled?: boolean;
}

export function FormatDropdown({
  selectedFormat,
  onFormatChange,
  disabled = false,
}: FormatDropdownProps) {
  const selectedDefinition = FORMAT_DEFINITIONS[selectedFormat];

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Tournament Format</label>
      <select
        value={selectedFormat}
        onChange={(e) => onFormatChange(e.target.value as EventFormat)}
        disabled={disabled}
        className="w-full px-3 py-2 border rounded-md bg-background text-sm disabled:opacity-50"
      >
        {FORMAT_CATEGORIES.map((category) => (
          <optgroup key={category.id} label={category.name}>
            {category.formats.map((formatId) => {
              const format = FORMAT_DEFINITIONS[formatId as EventFormat];
              if (!format) return null;
              return (
                <option key={formatId} value={formatId}>
                  {format.name}
                </option>
              );
            })}
          </optgroup>
        ))}
      </select>
      {selectedDefinition && (
        <p className="text-xs text-muted-foreground">
          {selectedDefinition.description}
        </p>
      )}
    </div>
  );
}

// Format info card component
interface FormatInfoProps {
  format: EventFormat;
  showRules?: boolean;
}

export function FormatInfo({ format, showRules = false }: FormatInfoProps) {
  const definition = FORMAT_DEFINITIONS[format];

  if (!definition) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{definition.name}</CardTitle>
          <Badge variant="secondary" className="text-xs">
            {definition.partnerMode === "rotating" ? "Rotating Partners" : "Fixed Teams"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{definition.description}</p>

        <div>
          <h4 className="text-xs font-medium uppercase text-muted-foreground mb-1">
            Key Features
          </h4>
          <div className="flex flex-wrap gap-1">
            {definition.keyFeatures.map((feature, idx) => (
              <Badge key={idx} variant="outline" className="text-xs">
                {feature}
              </Badge>
            ))}
          </div>
        </div>

        {showRules && definition.rules.length > 0 && (
          <div>
            <h4 className="text-xs font-medium uppercase text-muted-foreground mb-1">
              How It Works
            </h4>
            <ul className="text-sm space-y-1">
              {definition.rules.map((rule, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span className="text-muted-foreground">{rule}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex gap-4 text-xs text-muted-foreground">
          <div>
            <span className="font-medium">Scoring:</span>{" "}
            {definition.scoringType === "court_weighted"
              ? "Court Points"
              : definition.scoringType === "win_percentage"
              ? "Win %"
              : "Games Won"}
          </div>
          <div>
            <span className="font-medium">Games/Round:</span>{" "}
            {Array.isArray(definition.gamesPerRound)
              ? `${definition.gamesPerRound[0]}-${definition.gamesPerRound[1]}`
              : definition.gamesPerRound}
          </div>
          <div>
            <span className="font-medium">Min Players:</span> {definition.minPlayers}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
