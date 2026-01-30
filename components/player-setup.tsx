"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Player } from "@/lib/types";
import { generateId } from "@/lib/tournament";

interface PlayerSetupProps {
  players: Player[];
  onPlayersChange: (players: Player[]) => void;
  onStartTournament: () => void;
  tournamentStarted: boolean;
}

export function PlayerSetup({
  players,
  onPlayersChange,
  onStartTournament,
  tournamentStarted,
}: PlayerSetupProps) {
  const [newPlayerName, setNewPlayerName] = useState("");

  const addPlayer = () => {
    if (newPlayerName.trim()) {
      onPlayersChange([
        ...players,
        { id: generateId(), name: newPlayerName.trim() },
      ]);
      setNewPlayerName("");
    }
  };

  const removePlayer = (id: string) => {
    onPlayersChange(players.filter((p) => p.id !== id));
  };

  const canStart = players.length >= 4;
  const playersOnBye = players.length % 4;
  const gamesPerRound = Math.floor(players.length / 4);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Add Players</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Player name"
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addPlayer()}
              disabled={tournamentStarted}
              className="text-base"
            />
            <Button onClick={addPlayer} disabled={tournamentStarted}>
              Add
            </Button>
          </div>

          {players.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium mb-2">
                Players ({players.length})
              </h4>
              <div className="flex flex-wrap gap-2">
                {players.map((player) => (
                  <Badge
                    key={player.id}
                    variant="secondary"
                    className="px-3 py-2 text-sm"
                  >
                    {player.name}
                    {!tournamentStarted && (
                      <button
                        onClick={() => removePlayer(player.id)}
                        className="ml-2 hover:text-destructive text-lg leading-none"
                      >
                        ×
                      </button>
                    )}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {players.length > 0 && players.length < 4 && (
            <p className="text-sm text-muted-foreground mt-4">
              Need at least 4 players to start.
            </p>
          )}
        </CardContent>
      </Card>

      {canStart && !tournamentStarted && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Start Round Robin</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 mb-4">
              <p className="text-sm text-muted-foreground">
                {players.length} players • {gamesPerRound} game{gamesPerRound !== 1 ? "s" : ""} per round
              </p>
              {playersOnBye > 0 && (
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  {playersOnBye} player{playersOnBye !== 1 ? "s" : ""} will sit out each round
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                Partners rotate each round so everyone plays with everyone!
              </p>
            </div>
            <Button onClick={onStartTournament} size="lg" className="w-full">
              Generate First Round
            </Button>
          </CardContent>
        </Card>
      )}

      {tournamentStarted && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Tournament In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {players.length} players • Partners rotate each round
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Go to Matches to enter scores or add more rounds.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
