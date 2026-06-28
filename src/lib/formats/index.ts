/**
 * Formats Library Index
 * Exports all format-related functionality
 */

// Re-export types
export * from '@/src/types/formats';
export * from '@/src/types/database';

// Re-export scoring utilities
export {
  calculateWinPercentage,
  calculateWinPercentageDisplay,
  getDefaultCourtWeights,
  calculateCourtWeightedPoints,
  calculateTotalCourtWeightedPoints,
  calculateStandingsForFormat,
  sortStandings,
  getHeadToHeadRecord,
  updateCumulativeStanding,
  calculateRankChanges,
  getScoringSummary,
  getPrimaryMetric,
  getTiebreakerOrder,
  type CourtWeightConfig,
  type StandingCalculationOptions,
  type HeadToHeadRecord,
} from './scoring';

// Re-export rotating partner generators
export {
  generatePopcornRound,
  generateRoundRobinRound,
  generateGauntletRound,
  generateUpDownRiverRound,
  generateKingOfCourtRound,
  generateClaimThroneRound,
  generateCreamOfCropRound,
  generateDoubleHeaderRound,
  generateMixedMadnessRound,
  generateScrambleRound,
  generateRound,
  generateId,
  type GeneratorContext,
  type GeneratedRound,
} from './rotating-generators';

// Re-export fixed partner generators
export {
  createTeamsFromPlayers,
  createTeamsWithPartners,
  createPools,
  generatePoolPlayRound,
  generateShuffleRound,
  generateBracket,
  generateBracketRound,
  generateMiLPSchedule,
  generateMiLPRound,
  generateFixedRound,
  advanceWinner,
  advanceLoserToConsolation,
  calculatePoolStandings,
  type Team,
  type Pool,
  type BracketMatch,
  type FixedGeneratorContext,
  type GeneratedFixedRound,
  type PoolStanding,
} from './fixed-generators';

// Re-export court optimizer
export {
  calculatePlayerPlaytime,
  getPlaytimeVariance,
  optimizeCourtAssignments,
  balancePlaytime,
  getPlayersNeedingGames,
  suggestCourtWeights,
  suggestCourtWeightsExponential,
  calculateCourtMovements,
  calculatePlaytimeStatistics,
  type CourtAssignment,
  type PlayerPlaytime,
  type OptimizationResult,
  type OptimizationOptions,
  type CourtMovement,
  type PlaytimeStatistics,
} from './court-optimizer';
