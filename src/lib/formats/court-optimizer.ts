/**
 * Court Optimizer
 * Optimizes court assignments to minimize idle time and balance playtime
 */

import type { LocalPlayer, LocalRoundGame, LocalStanding } from '@/src/types/database';

// ============================================
// TYPES
// ============================================

export interface CourtAssignment {
  courtNumber: number;
  players: LocalPlayer[];
  game?: LocalRoundGame;
}

export interface PlayerPlaytime {
  playerId: string;
  playerName: string;
  gamesPlayed: number;
  roundsPlayed: number;
  roundsOnBye: number;
  totalPlaytime: number; // in minutes (estimated)
  courtDistribution: Map<number, number>; // courtNumber -> games played
}

export interface OptimizationResult {
  assignments: CourtAssignment[];
  idleTime: number; // Total idle time in minutes
  playtimeVariance: number; // Variance in playtime across players
  swapsPerformed: number;
}

export interface OptimizationOptions {
  minimizeIdleTime: boolean;
  balancePlaytime: boolean;
  preferNewPartnerships: boolean;
  respectCourtPreferences?: Map<string, number[]>; // playerId -> preferred courts
  maxSwaps?: number;
}

// ============================================
// PLAYTIME TRACKING
// ============================================

export function calculatePlayerPlaytime(
  players: LocalPlayer[],
  games: LocalRoundGame[],
  estimatedGameDuration: number = 15 // minutes
): Map<string, PlayerPlaytime> {
  const playtimeMap = new Map<string, PlayerPlaytime>();

  // Initialize playtime for all players
  for (const player of players) {
    playtimeMap.set(player.id, {
      playerId: player.id,
      playerName: player.name,
      gamesPlayed: 0,
      roundsPlayed: 0,
      roundsOnBye: 0,
      totalPlaytime: 0,
      courtDistribution: new Map(),
    });
  }

  // Track rounds
  const roundNumbers = new Set(games.map(g => g.round));
  const totalRounds = roundNumbers.size;

  // Process games
  for (const game of games) {
    const allPlayers = [...game.team1, ...game.team2];

    for (const player of allPlayers) {
      const playtime = playtimeMap.get(player.id);
      if (playtime) {
        playtime.gamesPlayed++;
        playtime.totalPlaytime += estimatedGameDuration;

        const courtCount = playtime.courtDistribution.get(game.courtNumber) ?? 0;
        playtime.courtDistribution.set(game.courtNumber, courtCount + 1);
      }
    }
  }

  // Calculate rounds played and bye rounds
  const gamesByRound = games.reduce((acc, game) => {
    if (!acc.has(game.round)) acc.set(game.round, []);
    acc.get(game.round)!.push(game);
    return acc;
  }, new Map<number, LocalRoundGame[]>());

  for (const round of roundNumbers) {
    const roundGames = gamesByRound.get(round) || [];
    const playersInRound = new Set<string>();

    for (const game of roundGames) {
      game.team1.forEach(p => playersInRound.add(p.id));
      game.team2.forEach(p => playersInRound.add(p.id));
    }

    for (const player of players) {
      const playtime = playtimeMap.get(player.id);
      if (playtime) {
        if (playersInRound.has(player.id)) {
          playtime.roundsPlayed++;
        } else {
          playtime.roundsOnBye++;
        }
      }
    }
  }

  return playtimeMap;
}

export function getPlaytimeVariance(playtimeMap: Map<string, PlayerPlaytime>): number {
  const playtimes = Array.from(playtimeMap.values()).map(p => p.gamesPlayed);

  if (playtimes.length === 0) return 0;

  const mean = playtimes.reduce((a, b) => a + b, 0) / playtimes.length;
  const variance = playtimes.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / playtimes.length;

  return variance;
}

// ============================================
// COURT OPTIMIZATION
// ============================================

export function optimizeCourtAssignments(
  players: LocalPlayer[],
  numberOfCourts: number,
  existingGames: LocalRoundGame[],
  options: OptimizationOptions
): OptimizationResult {
  const playtimeMap = calculatePlayerPlaytime(players, existingGames);

  // Sort players by games played (ascending) to prioritize those with fewer games
  const sortedPlayers = [...players].sort((a, b) => {
    const aPlaytime = playtimeMap.get(a.id)?.gamesPlayed ?? 0;
    const bPlaytime = playtimeMap.get(b.id)?.gamesPlayed ?? 0;
    return aPlaytime - bPlaytime;
  });

  // Initial assignment: fill courts with players who need more games
  const assignments: CourtAssignment[] = [];
  let playerIndex = 0;

  for (let court = 1; court <= numberOfCourts; court++) {
    const courtPlayers: LocalPlayer[] = [];

    while (courtPlayers.length < 4 && playerIndex < sortedPlayers.length) {
      courtPlayers.push(sortedPlayers[playerIndex]);
      playerIndex++;
    }

    assignments.push({
      courtNumber: court,
      players: courtPlayers,
    });
  }

  // Apply optimizations
  let swapsPerformed = 0;
  const maxSwaps = options.maxSwaps ?? 100;

  if (options.balancePlaytime) {
    const result = balancePlaytimeAcrossCourts(assignments, playtimeMap, maxSwaps);
    swapsPerformed += result.swaps;
  }

  if (options.minimizeIdleTime) {
    const result = minimizeIdleTimeForCourts(assignments, playtimeMap);
    swapsPerformed += result.swaps;
  }

  // Calculate final metrics
  const idleTime = calculateTotalIdleTime(assignments, players);
  const playtimeVariance = getPlaytimeVariance(playtimeMap);

  return {
    assignments,
    idleTime,
    playtimeVariance,
    swapsPerformed,
  };
}

function balancePlaytimeAcrossCourts(
  assignments: CourtAssignment[],
  playtimeMap: Map<string, PlayerPlaytime>,
  maxSwaps: number
): { swaps: number } {
  let swaps = 0;

  for (let iteration = 0; iteration < maxSwaps; iteration++) {
    let improved = false;

    // Try swapping players between courts to balance playtime
    for (let i = 0; i < assignments.length; i++) {
      for (let j = i + 1; j < assignments.length; j++) {
        const court1 = assignments[i];
        const court2 = assignments[j];

        // Calculate average playtime for each court
        const avg1 = getAveragePlaytime(court1.players, playtimeMap);
        const avg2 = getAveragePlaytime(court2.players, playtimeMap);

        // Try each swap
        for (let p1 = 0; p1 < court1.players.length; p1++) {
          for (let p2 = 0; p2 < court2.players.length; p2++) {
            const player1 = court1.players[p1];
            const player2 = court2.players[p2];

            // Simulate swap
            const newCourt1Players = [...court1.players];
            const newCourt2Players = [...court2.players];
            newCourt1Players[p1] = player2;
            newCourt2Players[p2] = player1;

            const newAvg1 = getAveragePlaytime(newCourt1Players, playtimeMap);
            const newAvg2 = getAveragePlaytime(newCourt2Players, playtimeMap);

            // Check if swap improves balance
            const currentDiff = Math.abs(avg1 - avg2);
            const newDiff = Math.abs(newAvg1 - newAvg2);

            if (newDiff < currentDiff) {
              // Perform swap
              court1.players[p1] = player2;
              court2.players[p2] = player1;
              swaps++;
              improved = true;
            }
          }
        }
      }
    }

    if (!improved) break;
  }

  return { swaps };
}

function getAveragePlaytime(players: LocalPlayer[], playtimeMap: Map<string, PlayerPlaytime>): number {
  if (players.length === 0) return 0;

  const total = players.reduce((sum, p) => {
    return sum + (playtimeMap.get(p.id)?.gamesPlayed ?? 0);
  }, 0);

  return total / players.length;
}

function minimizeIdleTimeForCourts(
  assignments: CourtAssignment[],
  playtimeMap: Map<string, PlayerPlaytime>
): { swaps: number } {
  // For now, idle time minimization focuses on ensuring all courts have enough players
  // More sophisticated algorithms could consider court transition times

  let swaps = 0;

  // Move players from overfilled courts to underfilled courts
  const underfilled = assignments.filter(a => a.players.length < 4);
  const overfilled = assignments.filter(a => a.players.length > 4);

  for (const under of underfilled) {
    while (under.players.length < 4 && overfilled.length > 0) {
      const over = overfilled.find(o => o.players.length > 4);
      if (!over) break;

      const playerToMove = over.players.pop();
      if (playerToMove) {
        under.players.push(playerToMove);
        swaps++;
      }

      if (over.players.length <= 4) {
        const idx = overfilled.indexOf(over);
        if (idx !== -1) overfilled.splice(idx, 1);
      }
    }
  }

  return { swaps };
}

function calculateTotalIdleTime(assignments: CourtAssignment[], allPlayers: LocalPlayer[]): number {
  // Count players not assigned to any court
  const assignedIds = new Set<string>();

  for (const assignment of assignments) {
    for (const player of assignment.players) {
      assignedIds.add(player.id);
    }
  }

  const idlePlayers = allPlayers.filter(p => !assignedIds.has(p.id));

  // Assume 15 minutes idle per player per round
  return idlePlayers.length * 15;
}

// ============================================
// BALANCE PLAYTIME
// ============================================

export function balancePlaytime(
  players: LocalPlayer[],
  games: LocalRoundGame[],
  targetGamesPerPlayer: number
): LocalPlayer[] {
  const playtimeMap = calculatePlayerPlaytime(players, games);

  // Sort players by games played (ascending) - those with fewer games get priority
  return [...players].sort((a, b) => {
    const aGames = playtimeMap.get(a.id)?.gamesPlayed ?? 0;
    const bGames = playtimeMap.get(b.id)?.gamesPlayed ?? 0;

    // Prioritize players who are furthest from target
    const aDiff = targetGamesPerPlayer - aGames;
    const bDiff = targetGamesPerPlayer - bGames;

    return bDiff - aDiff; // Higher diff = more priority
  });
}

export function getPlayersNeedingGames(
  players: LocalPlayer[],
  games: LocalRoundGame[],
  targetGamesPerPlayer: number
): LocalPlayer[] {
  const playtimeMap = calculatePlayerPlaytime(players, games);

  return players.filter(p => {
    const gamesPlayed = playtimeMap.get(p.id)?.gamesPlayed ?? 0;
    return gamesPlayed < targetGamesPerPlayer;
  });
}

// ============================================
// COURT WEIGHT SUGGESTIONS
// ============================================

export function suggestCourtWeights(numberOfCourts: number): Map<number, number> {
  const weights = new Map<number, number>();

  // King court (court 1) gets highest weight
  // Each subsequent court gets progressively lower weight

  for (let court = 1; court <= numberOfCourts; court++) {
    // Linear scale: court 1 = numberOfCourts, court N = 1
    weights.set(court, numberOfCourts - court + 1);
  }

  return weights;
}

export function suggestCourtWeightsExponential(numberOfCourts: number): Map<number, number> {
  const weights = new Map<number, number>();

  // Exponential scale for more dramatic differences
  for (let court = 1; court <= numberOfCourts; court++) {
    weights.set(court, Math.pow(2, numberOfCourts - court));
  }

  return weights;
}

// ============================================
// COURT MOVEMENT HELPERS
// ============================================

export interface CourtMovement {
  playerId: string;
  playerName: string;
  fromCourt: number;
  toCourt: number;
  direction: 'up' | 'down' | 'stay';
}

export function calculateCourtMovements(
  previousAssignments: CourtAssignment[],
  newAssignments: CourtAssignment[]
): CourtMovement[] {
  const movements: CourtMovement[] = [];

  // Build map of previous court assignments
  const previousCourts = new Map<string, number>();
  for (const assignment of previousAssignments) {
    for (const player of assignment.players) {
      previousCourts.set(player.id, assignment.courtNumber);
    }
  }

  // Calculate movements
  for (const assignment of newAssignments) {
    for (const player of assignment.players) {
      const fromCourt = previousCourts.get(player.id) ?? 0;
      const toCourt = assignment.courtNumber;

      let direction: 'up' | 'down' | 'stay';
      if (toCourt < fromCourt) {
        direction = 'up';
      } else if (toCourt > fromCourt) {
        direction = 'down';
      } else {
        direction = 'stay';
      }

      movements.push({
        playerId: player.id,
        playerName: player.name,
        fromCourt,
        toCourt,
        direction,
      });
    }
  }

  return movements;
}

// ============================================
// STATISTICS
// ============================================

export interface PlaytimeStatistics {
  totalPlayers: number;
  totalGames: number;
  averageGamesPerPlayer: number;
  minGamesPlayed: number;
  maxGamesPlayed: number;
  playersWithMinGames: LocalPlayer[];
  playersWithMaxGames: LocalPlayer[];
  playtimeDistribution: Map<number, number>; // games played -> count of players
}

export function calculatePlaytimeStatistics(
  players: LocalPlayer[],
  games: LocalRoundGame[]
): PlaytimeStatistics {
  const playtimeMap = calculatePlayerPlaytime(players, games);
  const playtimes = Array.from(playtimeMap.values());

  const totalGames = games.filter(g => g.completed).length;
  const gamesPlayedList = playtimes.map(p => p.gamesPlayed);

  const minGames = Math.min(...gamesPlayedList);
  const maxGames = Math.max(...gamesPlayedList);
  const avgGames = gamesPlayedList.reduce((a, b) => a + b, 0) / gamesPlayedList.length;

  const distribution = new Map<number, number>();
  for (const games of gamesPlayedList) {
    distribution.set(games, (distribution.get(games) ?? 0) + 1);
  }

  const playersWithMin = players.filter(p => playtimeMap.get(p.id)?.gamesPlayed === minGames);
  const playersWithMax = players.filter(p => playtimeMap.get(p.id)?.gamesPlayed === maxGames);

  return {
    totalPlayers: players.length,
    totalGames,
    averageGamesPerPlayer: avgGames,
    minGamesPlayed: minGames,
    maxGamesPlayed: maxGames,
    playersWithMinGames: playersWithMin,
    playersWithMaxGames: playersWithMax,
    playtimeDistribution: distribution,
  };
}
