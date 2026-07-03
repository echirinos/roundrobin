"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { DuprPlayer } from "@/src/lib/dupr/types";
import { isValidDuprId, formatDuprRating, getDuprTier } from "@/src/lib/dupr/service";
import { DuprRatingBadge } from "./dupr-login";

interface DuprSearchProps {
  onPlayerSelect: (player: DuprPlayer) => void;
  disabled?: boolean;
}

export function DuprSearch({ onPlayerSelect, disabled = false }: DuprSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<DuprPlayer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchMode, setSearchMode] = useState<"id" | "name">("id");

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setError(null);
    setSearchResults([]);

    try {
      if (searchMode === "id") {
        // Search by DUPR ID
        if (!isValidDuprId(searchQuery.trim())) {
          setError("Please enter a valid DUPR ID (6-10 digits)");
          setIsSearching(false);
          return;
        }

        // Call API to get player by DUPR ID
        const response = await fetch(`/api/dupr/player/${searchQuery.trim()}`);

        if (!response.ok) {
          if (response.status === 404) {
            setError("Player not found. Check the DUPR ID and try again.");
          } else {
            setError("Failed to search. Please try again.");
          }
          setIsSearching(false);
          return;
        }

        const player = await response.json();
        setSearchResults([player]);
      } else {
        // Search by name
        const response = await fetch(
          `/api/dupr/search?q=${encodeURIComponent(searchQuery.trim())}`
        );

        if (!response.ok) {
          setError("Search failed. Please try again.");
          setIsSearching(false);
          return;
        }

        const results = await response.json();
        setSearchResults(results);

        if (results.length === 0) {
          setError("No players found. Try a different search term.");
        }
      }
    } catch (err) {
      console.error("Search error:", err);
      setError("Search failed. Please check your connection and try again.");
    }

    setIsSearching(false);
  }, [searchQuery, searchMode]);

  const handleSelectPlayer = (player: DuprPlayer) => {
    onPlayerSelect(player);
    setSearchQuery("");
    setSearchResults([]);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <svg
            className="w-5 h-5"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
            <path d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z" />
          </svg>
          Search DUPR Player
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Mode Toggle */}
        <div className="flex gap-2">
          <Button
            variant={searchMode === "id" ? "default" : "outline"}
            size="sm"
            className="min-h-11 sm:min-h-8"
            onClick={() => setSearchMode("id")}
            disabled={disabled || isSearching}
          >
            By DUPR ID
          </Button>
          <Button
            variant={searchMode === "name" ? "default" : "outline"}
            size="sm"
            className="min-h-11 sm:min-h-8"
            onClick={() => setSearchMode("name")}
            disabled={disabled || isSearching}
          >
            By Name
          </Button>
        </div>

        {/* Search Input */}
        <div className="flex gap-2">
          <Input
            placeholder={searchMode === "id" ? "Enter DUPR ID (e.g., 12345678)" : "Enter player name"}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            disabled={disabled || isSearching}
            className="flex-1"
          />
          <Button
            onClick={handleSearch}
            disabled={disabled || isSearching || !searchQuery.trim()}
          >
            {isSearching ? "Searching..." : "Search"}
          </Button>
        </div>

        {/* Error Message */}
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {searchResults.length} player{searchResults.length !== 1 ? "s" : ""} found
            </p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {searchResults.map((player) => (
                <button
                  key={player.duprId || player.id}
                  onClick={() => handleSelectPlayer(player)}
                  className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {player.duprImageUrl ? (
                      <img
                        src={player.duprImageUrl}
                        alt={player.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold">
                        {player.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{player.name}</div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {player.duprId && <span>#{player.duprId}</span>}
                        {player.duprRating && (
                          <DuprRatingBadge
                            rating={player.duprRating}
                            provisional={player.duprProvisional}
                            size="sm"
                          />
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" className="shrink-0">
                      Add
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Manual DUPR ID input for quick add
interface DuprIdInputProps {
  onSubmit: (duprId: string, rating?: number) => void;
  disabled?: boolean;
}

export function DuprIdInput({ onSubmit, disabled = false }: DuprIdInputProps) {
  const [duprId, setDuprId] = useState("");
  const [manualRating, setManualRating] = useState("");

  const handleSubmit = () => {
    if (!duprId.trim()) return;

    const rating = manualRating ? parseFloat(manualRating) : undefined;
    onSubmit(duprId.trim(), rating);
    setDuprId("");
    setManualRating("");
  };

  return (
    <div className="flex gap-2 items-end">
      <div className="flex-1 space-y-1">
        <label className="text-xs text-muted-foreground">DUPR ID</label>
        <Input
          placeholder="12345678"
          value={duprId}
          onChange={(e) => setDuprId(e.target.value.replace(/\D/g, ""))}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          disabled={disabled}
          className="font-mono"
          maxLength={10}
        />
      </div>
      <div className="w-24 space-y-1">
        <label className="text-xs text-muted-foreground">Rating (opt)</label>
        <Input
          type="number"
          step="0.01"
          min="2.0"
          max="8.0"
          placeholder="4.50"
          value={manualRating}
          onChange={(e) => setManualRating(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          disabled={disabled}
          className="font-mono"
        />
      </div>
      <Button onClick={handleSubmit} disabled={disabled || !duprId.trim()}>
        Add
      </Button>
    </div>
  );
}
