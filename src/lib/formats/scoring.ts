/**
 * Scoring Utility Functions
 * Handles win percentage, court-weighted points, and standings calculations
 */

import type {
  LocalPlayer,
  LocalRoundGame,
  LocalStanding,
  CumulativeStanding,
  CourtWeight,
} from '@/src/types/database';
import type { ScoringType, EventFormat } from '@/src/types/formats';

// ============================================
// WIN PERCENTAGE CALCULATION
// ============================================

export function calculateWinPercentage(gamesWon: number, gamesPlayed: number): number {
  if (gamesPlayed === 0) return 0;
  return Math.round((gamesWon / gamesPlayed) * 10000) / 10000; // 4 decimal precision
}

export function calculateWinPercentageDisplay(gamesWon: number, gamesPlayed: number): number {
  if (gamesPlayed === 0) return 0;
  return Math.round((gamesWon / gamesPlayed) * 100);
}

// ============================================
// COURT-WEIGHTED POINTS
// ============================================

export interface CourtWeightConfig {
  [courtNumber: number]: number;
}

export function getDefaultCourtWeights(numberOfCourts: number): CourtWeightConfig {
  const weights: CourtWeightConfig = {};

  // King court (court 1) has highest weight, decreasing from there
  for (let i = 1; i <= numberOfCourts; i++) {
    // Court 1 = highest weight (numberOfCourts points)
    // Court 2 = numberOfCourts - 1 points, etc.
    weights[i] = numberOfCourts - i + 1;
  }

  return weights;
}

export function calculateCourtWeightedPoints(
  courtNumber: number,
  won: boolean,
  courtWeights: CourtWeightConfig
): number {
  if (!won) return 0;
  return courtWeights[courtNumber] ?? 1;
}

export function calculateTotalCourtWeightedPoints(
  games: LocalRoundGame[],
  playerId: string,
  courtWeights: CourtWeightConfig
): number {
  let total = 0;

  for (const game of games) {
    if (!game.completed || game.team1Score === undefined || game.team2Score === undefined) {
      continue;
    }

    const isOnTeam1 = game.team1.some(p => p.id === playerId);
    const isOnTeam2 = game.team2.some(p => p.id === playerId);

    if (!isOnTeam1 && !isOnTeam2) continue;

    const team1Won = game.team1Score > game.team2Score;
    const playerWon = (isOnTeam1 && team1Won) || (isOnTeam2 && !team1Won);

    if (playerWon) {
      total += courtWeights[game.courtNumber] ?? 1;
    }
  }

  return total;
}

// ============================================
// STANDINGS CALCULATION
// ============================================

export interface StandingCalculationOptions {
  scoringType: ScoringType;
  courtWeights?: CourtWeightConfig;
  includePointDifferential?: boolean;
}

export function calculateStandingsForFormat(
  players: LocalPlayer[],
  games: LocalRoundGame[],
  options: StandingCalculationOptions
): LocalStanding[] {
  const { scoringType, courtWeights = {}, includePointDifferential = true } = options;

  // Initialize standings for all players
  const standingsMap = new Map<string, LocalStanding>();

  for (const player of players) {
    standingsMap.set(player.id, {
      player,
      gamesPlayed: 0,
      gamesWon: 0,
      gamesLost: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      pointDifferential: 0,
      courtWeightedPoints: 0,
      winPercentage: 0,
      currentRank: 0,
    });
  }

  // Process completed games
  for (const game of games) {
    if (!game.completed || game.team1Score === undefined || game.team2Score === undefined) {
      continue;
    }

    const team1Won = game.team1Score > game.team2Score;
    const courtWeight = courtWeights[game.courtNumber] ?? 1;

    // Update team 1 players
    for (const player of game.team1) {
      const standing = standingsMap.get(player.id);
      if (standing) {
        standing.gamesPlayed++;
        standing.pointsFor += game.team1Score;
        standing.pointsAgainst += game.team2Score;

        if (team1Won) {
          standing.gamesWon++;
          standing.courtWeightedPoints += courtWeight;
        } else if (game.team2Score > game.team1Score) {
          standing.gamesLost++;
        }
      }
    }

    // Update team 2 players
    for (const player of game.team2) {
      const standing = standingsMap.get(player.id);
      if (standing) {
        standing.gamesPlayed++;
        standing.pointsFor += game.team2Score;
        standing.pointsAgainst += game.team1Score;

        if (!team1Won && game.team2Score > game.team1Score) {
          standing.gamesWon++;
          standing.courtWeightedPoints += courtWeight;
        } else if (team1Won) {
          standing.gamesLost++;
        }
      }
    }
  }

  // Calculate derived metrics
  for (const standing of standingsMap.values()) {
    standing.pointDifferential = standing.pointsFor - standing.pointsAgainst;
    standing.winPercentage = calculateWinPercentageDisplay(standing.gamesWon, standing.gamesPlayed);
  }

  // Sort standings based on scoring type
  const standings = Array.from(standingsMap.values());
  sortStandings(standings, scoringType, games);

  // Assign ranks
  for (let i = 0; i < standings.length; i++) {
    standings[i].currentRank = i + 1;
  }

  return standings;
}

// ============================================
// STANDINGS SORTING
// ============================================

export function sortStandings(
  standings: LocalStanding[],
  scoringType: ScoringType,
  games: LocalRoundGame[]
): void {
  standings.sort((a, b) => {
    // Primary sort based on scoring type
    switch (scoringType) {
      case 'court_weighted':
        if (b.courtWeightedPoints !== a.courtWeightedPoints) {
          return b.courtWeightedPoints - a.courtWeightedPoints;
        }
        break;

      case 'win_percentage':
      case 'games_won':
      default:
        if (b.gamesWon !== a.gamesWon) {
          return b.gamesWon - a.gamesWon;
        }
        break;
    }

    // Secondary: Win percentage
    if (b.winPercentage !== a.winPercentage) {
      return b.winPercentage - a.winPercentage;
    }

    // Tertiary: Head-to-head
    const h2h = getHeadToHeadRecord(a.player.id, b.player.id, games);
    if (h2h.wins !== h2h.losses) {
      return h2h.losses - h2h.wins; // More losses = lower rank for player a
    }

    // Quaternary: Point differential
    if (b.pointDifferential !== a.pointDifferential) {
      return b.pointDifferential - a.pointDifferential;
    }

    // Final: Points for
    return b.pointsFor - a.pointsFor;
  });
}

// ============================================
// HEAD-TO-HEAD RECORDS
// ============================================

export interface HeadToHeadRecord {
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
}

export function getHeadToHeadRecord(
  playerId: string,
  opponentId: string,
  games: LocalRoundGame[]
): HeadToHeadRecord {
  const record: HeadToHeadRecord = {
    wins: 0,
    losses: 0,
    pointsFor: 0,
    pointsAgainst: 0,
  };

  for (const game of games) {
    if (!game.completed || game.team1Score === undefined || game.team2Score === undefined) {
      continue;
    }

    const playerOnTeam1 = game.team1.some(p => p.id === playerId);
    const playerOnTeam2 = game.team2.some(p => p.id === playerId);
    const opponentOnTeam1 = game.team1.some(p => p.id === opponentId);
    const opponentOnTeam2 = game.team2.some(p => p.id === opponentId);

    // Only count games where they played against each other
    if ((playerOnTeam1 && opponentOnTeam2) || (playerOnTeam2 && opponentOnTeam1)) {
      const team1Won = game.team1Score > game.team2Score;

      if (playerOnTeam1) {
        record.pointsFor += game.team1Score;
        record.pointsAgainst += game.team2Score;
        if (team1Won) record.wins++;
        else if (game.team2Score > game.team1Score) record.losses++;
      } else {
        record.pointsFor += game.team2Score;
        record.pointsAgainst += game.team1Score;
        if (!team1Won && game.team2Score > game.team1Score) record.wins++;
        else if (team1Won) record.losses++;
      }
    }
  }

  return record;
}

// ============================================
// CUMULATIVE STANDINGS UPDATE
// ============================================

export function updateCumulativeStanding(
  existing: CumulativeStanding | null,
  gameResult: {
    won: boolean;
    pointsFor: number;
    pointsAgainst: number;
    courtWeight: number;
  }
): Partial<CumulativeStanding> {
  const base = existing ?? {
    games_played: 0,
    games_won: 0,
    games_lost: 0,
    points_for: 0,
    points_against: 0,
    point_differential: 0,
    court_weighted_points: 0,
    win_percentage: 0,
    average_point_differential: 0,
    current_streak: 0,
    best_streak: 0,
    rounds_played: 0,
    byes_taken: 0,
  };

  const gamesPlayed = base.games_played + 1;
  const gamesWon = base.games_won + (gameResult.won ? 1 : 0);
  const gamesLost = base.games_lost + (gameResult.won ? 0 : 1);
  const pointsFor = base.points_for + gameResult.pointsFor;
  const pointsAgainst = base.points_against + gameResult.pointsAgainst;
  const pointDifferential = pointsFor - pointsAgainst;
  const courtWeightedPoints = base.court_weighted_points + (gameResult.won ? gameResult.courtWeight : 0);

  // Streak calculation
  let currentStreak = base.current_streak;
  if (gameResult.won) {
    currentStreak = currentStreak >= 0 ? currentStreak + 1 : 1;
  } else {
    currentStreak = currentStreak <= 0 ? currentStreak - 1 : -1;
  }

  const bestStreak = Math.max(base.best_streak, currentStreak);

  return {
    games_played: gamesPlayed,
    games_won: gamesWon,
    games_lost: gamesLost,
    points_for: pointsFor,
    points_against: pointsAgainst,
    point_differential: pointDifferential,
    court_weighted_points: courtWeightedPoints,
    win_percentage: calculateWinPercentage(gamesWon, gamesPlayed),
    average_point_differential: gamesPlayed > 0 ? pointDifferential / gamesPlayed : 0,
    current_streak: currentStreak,
    best_streak: bestStreak,
  };
}

// ============================================
// RANK CHANGES
// ============================================

export function calculateRankChanges(
  previousStandings: LocalStanding[],
  currentStandings: LocalStanding[]
): Map<string, number> {
  const changes = new Map<string, number>();

  const previousRanks = new Map<string, number>();
  previousStandings.forEach((s, i) => previousRanks.set(s.player.id, i + 1));

  for (let i = 0; i < currentStandings.length; i++) {
    const playerId = currentStandings[i].player.id;
    const currentRank = i + 1;
    const previousRank = previousRanks.get(playerId) ?? currentRank;
    changes.set(playerId, previousRank - currentRank); // Positive = moved up
  }

  return changes;
}

// ============================================
// FORMAT-SPECIFIC SCORING HELPERS
// ============================================

export function getScoringSummary(standing: LocalStanding, scoringType: ScoringType): string {
  switch (scoringType) {
    case 'court_weighted':
      return `${standing.courtWeightedPoints} pts`;
    case 'win_percentage':
      return `${standing.winPercentage}%`;
    case 'games_won':
      return `${standing.gamesWon} W`;
    default:
      return `${standing.gamesWon}-${standing.gamesLost}`;
  }
}

export function getPrimaryMetric(standing: LocalStanding, scoringType: ScoringType): number {
  switch (scoringType) {
    case 'court_weighted':
      return standing.courtWeightedPoints;
    case 'win_percentage':
      return standing.winPercentage;
    case 'games_won':
    default:
      return standing.gamesWon;
  }
}

// ============================================
// TIEBREAKER EXPLANATION
// ============================================

export function getTiebreakerOrder(scoringType: ScoringType): string[] {
  switch (scoringType) {
    case 'court_weighted':
      return [
        'Court points',
        'Win rate',
        'Head-to-head',
        'Margin',
        'Points scored',
      ];
    case 'win_percentage':
    case 'games_won':
    default:
      return [
        'Wins',
        'Win rate',
        'Head-to-head',
        'Margin',
        'Points scored',
      ];
  }
}
