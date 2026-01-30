"use client";

import { useState, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { PlayerSetup } from "@/components/player-setup";
import { Schedule } from "@/components/schedule";
import { Standings } from "@/components/standings";
import { Player, Match, PlayerStanding } from "@/lib/types";
import {
  generateRoundRobinSchedule,
  calculateStandings,
} from "@/lib/tournament";

const STORAGE_KEY = "pickleball-round-robin-v2";

interface TournamentState {
  players: Player[];
  matches: Match[];
  tournamentStarted: boolean;
}

const initialState: TournamentState = {
  players: [],
  matches: [],
  tournamentStarted: false,
};

export default function Home() {
  const [state, setState] = useState<TournamentState>(initialState);
  const [standings, setStandings] = useState<PlayerStanding[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setState(parsed);
      } catch (e) {
        console.error("Failed to load saved tournament:", e);
      }
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage whenever state changes
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [state, isLoaded]);

  // Calculate standings whenever matches change
  useEffect(() => {
    if (state.players.length > 0) {
      setStandings(calculateStandings(state.players, state.matches));
    }
  }, [state.players, state.matches]);

  const handlePlayersChange = useCallback((players: Player[]) => {
    setState((prev) => ({ ...prev, players }));
  }, []);

  const handleStartTournament = useCallback(() => {
    const matches = generateRoundRobinSchedule(state.players);
    setState((prev) => ({
      ...prev,
      matches,
      tournamentStarted: true,
    }));
  }, [state.players]);

  const handleUpdateMatch = useCallback(
    (matchId: string, score1: number, score2: number) => {
      setState((prev) => ({
        ...prev,
        matches: prev.matches.map((m) =>
          m.id === matchId ? { ...m, score1, score2, completed: true } : m
        ),
      }));
    },
    []
  );

  const handleAddRound = useCallback((newMatches: Match[]) => {
    setState((prev) => ({
      ...prev,
      matches: [...prev.matches, ...newMatches],
    }));
  }, []);

  const handleResetTournament = useCallback(() => {
    if (window.confirm("Reset tournament? All scores will be lost.")) {
      setState(initialState);
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // Don't render until loaded to avoid hydration mismatch
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-4 sm:py-8 px-3 sm:px-4 max-w-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 sm:mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Pickleball Round Robin</h1>
            <p className="text-sm text-muted-foreground">
              Rotating partners each round
            </p>
          </div>
          {state.tournamentStarted && (
            <Button variant="destructive" size="sm" onClick={handleResetTournament}>
              Reset
            </Button>
          )}
        </div>

        <Tabs defaultValue={state.tournamentStarted ? "schedule" : "setup"}>
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="setup" className="text-sm">Players</TabsTrigger>
            <TabsTrigger value="schedule" disabled={!state.tournamentStarted} className="text-sm">
              Matches
            </TabsTrigger>
            <TabsTrigger value="standings" disabled={!state.tournamentStarted} className="text-sm">
              Standings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="setup" className="mt-0">
            <PlayerSetup
              players={state.players}
              onPlayersChange={handlePlayersChange}
              onStartTournament={handleStartTournament}
              tournamentStarted={state.tournamentStarted}
            />
          </TabsContent>

          <TabsContent value="schedule" className="mt-0">
            {state.tournamentStarted && (
              <Schedule
                matches={state.matches}
                players={state.players}
                onUpdateMatch={handleUpdateMatch}
                onAddRound={handleAddRound}
              />
            )}
          </TabsContent>

          <TabsContent value="standings" className="mt-0">
            <Standings standings={standings} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
