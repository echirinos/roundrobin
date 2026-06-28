/**
 * Tournament Format Definitions and Types
 * Supports 13 new formats from Pickleheads + Swish
 */

// ============================================
// ENUMS
// ============================================

export type EventFormat =
  // Traditional formats
  | 'single_elimination'
  | 'double_elimination'
  | 'round_robin'
  | 'swiss'
  | 'pool_play'
  | 'gauntlet'
  // Rotating partner formats
  | 'popcorn'
  | 'up_down_river'
  | 'king_of_court'
  | 'claim_throne'
  | 'cream_crop'
  | 'double_header'
  | 'mixed_madness'
  | 'scramble'
  // Fixed partner formats
  | 'shuffle'
  | 'bracket'
  | 'milp';

export type PartnerMode = 'rotating' | 'fixed';

export type ScoringType = 'win_percentage' | 'court_weighted' | 'points' | 'games_won';

export type SeedingMethod = 'rating' | 'random' | 'manual' | 'standings';

export type MatchStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export type PlayerGender = 'male' | 'female' | 'other' | 'prefer_not_to_say';

// ============================================
// FORMAT DEFINITION INTERFACE
// ============================================

export interface FormatDefinition {
  id: EventFormat;
  name: string;
  shortName: string;
  description: string;
  category: 'rotating' | 'fixed' | 'traditional';
  partnerMode: PartnerMode;
  scoringType: ScoringType;
  gamesPerRound: number | [number, number]; // fixed or [min, max] range
  seedingMethod: SeedingMethod;
  minPlayers: number;
  maxPlayers?: number;
  requiresEvenPlayers?: boolean;
  requiresMultipleOf4?: boolean;
  supportsGenderBalance?: boolean;
  supportsCourtWeighting?: boolean;
  supportsByes?: boolean;
  keyFeatures: string[];
  rules: string[];
}

// ============================================
// EVENT SETTINGS INTERFACE
// ============================================

export interface EventSettings {
  format: EventFormat;
  partnerMode: PartnerMode;
  scoringType: ScoringType;
  gamesPerRound: number;
  seedingMethod: SeedingMethod;
  numberOfCourts: number;
  winBy: number; // Win by X points
  pointsToWin: number; // Play to X points
  maxRounds?: number;

  // Format-specific options
  formatOptions: FormatOptions;

  // Court optimizer
  courtOptimizer: {
    enabled: boolean;
    minimizeIdleTime: boolean;
    balancePlaytime: boolean;
  };
}

export interface FormatOptions {
  // Pool Play
  poolCount?: number;
  teamsPerPool?: number;
  advanceFromPool?: number; // How many teams advance from each pool
  playoffFormat?: 'single_elimination' | 'double_elimination';

  // Bracket
  consolationBracket?: boolean;
  thirdPlaceMatch?: boolean;
  seedingFromPools?: boolean;

  // Mixed Madness
  genderBalanceMode?: 'strict' | 'flexible' | 'none';
  requireMixedTeams?: boolean;

  // Scramble
  playersPerGroup?: number; // 4-5 players per court group

  // Cream of the Crop
  sortingRounds?: number; // Number of rounds for initial sorting phase
  competitionRounds?: number;

  // Double Header
  gamesPerPartnership?: number;

  // King of Court / Claim Throne
  kingCourtBonus?: number; // Extra points for winning on King Court

  // MiLP
  matchesPerOpponent?: number;
  autoRotatePartners?: boolean;

  // Up & Down River
  playersMovingUp?: number; // Top X players move up
  playersMovingDown?: number; // Bottom X players move down
}

// ============================================
// FORMAT DEFINITIONS
// ============================================

export const FORMAT_DEFINITIONS: Record<EventFormat, FormatDefinition> = {
  // Traditional Formats
  single_elimination: {
    id: 'single_elimination',
    name: 'Single Elimination',
    shortName: 'Single Elim',
    description: 'Classic bracket format. Lose once and you\'re out.',
    category: 'traditional',
    partnerMode: 'fixed',
    scoringType: 'games_won',
    gamesPerRound: 1,
    seedingMethod: 'rating',
    minPlayers: 4,
    keyFeatures: ['Quick format', 'High stakes', 'Clear winner'],
    rules: ['Lose one match and you\'re eliminated', 'Winner advances to next round'],
  },

  double_elimination: {
    id: 'double_elimination',
    name: 'Double Elimination',
    shortName: 'Double Elim',
    description: 'Bracket with a losers bracket. Must lose twice to be eliminated.',
    category: 'traditional',
    partnerMode: 'fixed',
    scoringType: 'games_won',
    gamesPerRound: 1,
    seedingMethod: 'rating',
    minPlayers: 4,
    keyFeatures: ['Second chance', 'More games', 'True champion'],
    rules: ['Lose once, drop to losers bracket', 'Lose twice and you\'re out'],
  },

  round_robin: {
    id: 'round_robin',
    name: 'Round Robin',
    shortName: 'Round Robin',
    description: 'Rotating doubles that prioritizes a different partner each round.',
    category: 'traditional',
    partnerMode: 'rotating',
    scoringType: 'win_percentage',
    gamesPerRound: 1,
    seedingMethod: 'random',
    minPlayers: 4,
    requiresMultipleOf4: false,
    supportsByes: true,
    keyFeatures: ['Unique partners', 'Fresh opponents', '7-round friendly'],
    rules: ['Prioritizes unused partnerships first', 'Then avoids repeated opponents where possible', 'Ranked by win percentage'],
  },

  swiss: {
    id: 'swiss',
    name: 'Swiss System',
    shortName: 'Swiss',
    description: 'Players with similar records face each other. No elimination.',
    category: 'traditional',
    partnerMode: 'rotating',
    scoringType: 'win_percentage',
    gamesPerRound: 1,
    seedingMethod: 'standings',
    minPlayers: 8,
    keyFeatures: ['Competitive balance', 'No elimination', 'Similar-level matchups'],
    rules: ['Paired by current standings', 'Winners face winners', 'Fixed number of rounds'],
  },

  pool_play: {
    id: 'pool_play',
    name: 'Pool Play',
    shortName: 'Pools',
    description: 'Round robin in small pools, then optional championship bracket.',
    category: 'fixed',
    partnerMode: 'fixed',
    scoringType: 'win_percentage',
    gamesPerRound: 1,
    seedingMethod: 'rating',
    minPlayers: 8,
    keyFeatures: ['Guaranteed games', 'Playoff bracket', 'Team format'],
    rules: ['Play all teams in your pool', 'Top teams advance to bracket', 'Fixed partners throughout'],
  },

  gauntlet: {
    id: 'gauntlet',
    name: 'Gauntlet',
    shortName: 'Gauntlet',
    description: 'Seeded matchups where winners face harder opponents.',
    category: 'rotating',
    partnerMode: 'rotating',
    scoringType: 'win_percentage',
    gamesPerRound: 1,
    seedingMethod: 'standings',
    minPlayers: 8,
    requiresMultipleOf4: true,
    keyFeatures: ['Skill-based matching', 'Harder as you win', 'Competitive'],
    rules: ['Seeded by current standings', 'Winners face tougher opponents', 'Partners rotate'],
  },

  // Rotating Partner Formats
  popcorn: {
    id: 'popcorn',
    name: 'Popcorn',
    shortName: 'Popcorn',
    description: 'Random matchups with shuffle button. Great for social mixing.',
    category: 'rotating',
    partnerMode: 'rotating',
    scoringType: 'win_percentage',
    gamesPerRound: 1,
    seedingMethod: 'random',
    minPlayers: 4,
    requiresMultipleOf4: false,
    supportsByes: true,
    keyFeatures: ['Shuffle button', 'Social mixing', 'Easy setup', 'Fun & casual'],
    rules: ['Random partner assignment', 'New partners each round', 'Ranked by win percentage'],
  },

  up_down_river: {
    id: 'up_down_river',
    name: 'Up & Down the River',
    shortName: 'River',
    description: 'Top 2 players move up a court, bottom 2 move down. Multiple games per round.',
    category: 'rotating',
    partnerMode: 'rotating',
    scoringType: 'court_weighted',
    gamesPerRound: [3, 5],
    seedingMethod: 'standings',
    minPlayers: 8,
    requiresMultipleOf4: true,
    supportsCourtWeighting: true,
    keyFeatures: ['Court movement', 'Multiple games', 'Competitive ladder'],
    rules: ['Top 2 move up, bottom 2 move down', '3-5 games per round', 'Court-weighted points'],
  },

  king_of_court: {
    id: 'king_of_court',
    name: 'King of the Court',
    shortName: 'King',
    description: 'Classic format. Winners move up, losers move down.',
    category: 'rotating',
    partnerMode: 'rotating',
    scoringType: 'court_weighted',
    gamesPerRound: 1,
    seedingMethod: 'standings',
    minPlayers: 8,
    requiresMultipleOf4: true,
    supportsCourtWeighting: true,
    keyFeatures: ['Winners advance', 'Court ladder', 'Classic format'],
    rules: ['Winners move up one court', 'Losers move down one court', 'King court worth most points'],
  },

  claim_throne: {
    id: 'claim_throne',
    name: 'Claim the Throne',
    shortName: 'Throne',
    description: 'King of Court variant. King court winners stay, challengers rotate in.',
    category: 'rotating',
    partnerMode: 'rotating',
    scoringType: 'court_weighted',
    gamesPerRound: 1,
    seedingMethod: 'standings',
    minPlayers: 8,
    requiresMultipleOf4: true,
    supportsCourtWeighting: true,
    keyFeatures: ['Defend the throne', 'Challenger format', 'High stakes'],
    rules: ['King court winners stay', 'New challengers rotate up', 'Earn bonus for title defenses'],
  },

  cream_crop: {
    id: 'cream_crop',
    name: 'Cream of the Crop',
    shortName: 'Cream',
    description: 'Two-phase format: sorting phase, then competitive play on assigned courts.',
    category: 'rotating',
    partnerMode: 'rotating',
    scoringType: 'court_weighted',
    gamesPerRound: [3, 5],
    seedingMethod: 'standings',
    minPlayers: 8,
    requiresMultipleOf4: true,
    supportsCourtWeighting: true,
    keyFeatures: ['Two phases', 'Skill sorting', 'Fair competition'],
    rules: ['Phase 1: Random rounds to sort players', 'Phase 2: Compete on assigned court', 'Court-weighted scoring'],
  },

  double_header: {
    id: 'double_header',
    name: 'Double Header',
    shortName: 'Double',
    description: 'Play 2 games with the same partner before rotating.',
    category: 'rotating',
    partnerMode: 'rotating',
    scoringType: 'win_percentage',
    gamesPerRound: [6, 9],
    seedingMethod: 'random',
    minPlayers: 8,
    requiresMultipleOf4: true,
    keyFeatures: ['Partner chemistry', 'More games together', 'Strategic'],
    rules: ['2 games with same partner', 'Then partners rotate', 'Win percentage determines ranking'],
  },

  mixed_madness: {
    id: 'mixed_madness',
    name: 'Mixed Madness',
    shortName: 'Mixed',
    description: 'Gender-balanced mixed doubles with random matchups.',
    category: 'rotating',
    partnerMode: 'rotating',
    scoringType: 'win_percentage',
    gamesPerRound: 1,
    seedingMethod: 'random',
    minPlayers: 4,
    supportsGenderBalance: true,
    keyFeatures: ['Gender balanced', 'Mixed doubles', 'Social format'],
    rules: ['Teams must be mixed gender', 'Random partner rotation', 'Equal male/female participation'],
  },

  scramble: {
    id: 'scramble',
    name: 'Scramble',
    shortName: 'Scramble',
    description: 'Groups of 4-5 players stay on same court, rotating partners within group.',
    category: 'rotating',
    partnerMode: 'rotating',
    scoringType: 'win_percentage',
    gamesPerRound: [3, 5],
    seedingMethod: 'random',
    minPlayers: 8,
    supportsByes: true,
    keyFeatures: ['Court groups', 'Less movement', 'Efficient'],
    rules: ['4-5 players per court group', 'Rotate partners within group', 'Play everyone in your group'],
  },

  // Fixed Partner Formats
  shuffle: {
    id: 'shuffle',
    name: 'Set Partners',
    shortName: 'Partners',
    description: 'Fixed-partner round robin. Teams stay together and rotate opponents.',
    category: 'fixed',
    partnerMode: 'fixed',
    scoringType: 'win_percentage',
    gamesPerRound: 1,
    seedingMethod: 'random',
    minPlayers: 4,
    keyFeatures: ['Set teams', 'Round robin', 'Fixed partners'],
    rules: ['Keep the same partner', 'Rotate opponents each round', 'Rank teams by win percentage'],
  },

  bracket: {
    id: 'bracket',
    name: 'Bracket',
    shortName: 'Bracket',
    description: 'Single elimination bracket with optional consolation bracket.',
    category: 'fixed',
    partnerMode: 'fixed',
    scoringType: 'games_won',
    gamesPerRound: 1,
    seedingMethod: 'rating',
    minPlayers: 4,
    maxPlayers: 64,
    keyFeatures: ['Single elimination', 'Consolation option', 'Clear structure'],
    rules: ['Seeded bracket', 'Win to advance', 'Optional consolation for first-round losers'],
  },

  milp: {
    id: 'milp',
    name: 'MiLP',
    shortName: 'MiLP',
    description: 'League play with automatic partner and opponent rotation for balanced matchups.',
    category: 'fixed',
    partnerMode: 'fixed',
    scoringType: 'win_percentage',
    gamesPerRound: 1,
    seedingMethod: 'rating',
    minPlayers: 8,
    keyFeatures: ['League format', 'Auto-rotation', 'Balanced matchups'],
    rules: ['Auto partner/opponent rotation', 'Everyone plays everyone', 'Balanced scheduling'],
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

export function getFormatsByCategory(category: 'rotating' | 'fixed' | 'traditional'): FormatDefinition[] {
  return Object.values(FORMAT_DEFINITIONS).filter(f => f.category === category);
}

export function getRotatingFormats(): FormatDefinition[] {
  return getFormatsByCategory('rotating');
}

export function getFixedFormats(): FormatDefinition[] {
  return getFormatsByCategory('fixed');
}

export function getTraditionalFormats(): FormatDefinition[] {
  return getFormatsByCategory('traditional');
}

export function isRotatingFormat(format: EventFormat): boolean {
  return FORMAT_DEFINITIONS[format]?.partnerMode === 'rotating';
}

export function isFixedPartnerFormat(format: EventFormat): boolean {
  return FORMAT_DEFINITIONS[format]?.partnerMode === 'fixed';
}

export function supportsCourtWeighting(format: EventFormat): boolean {
  return FORMAT_DEFINITIONS[format]?.supportsCourtWeighting ?? false;
}

export function getDefaultGamesPerRound(format: EventFormat): number {
  const def = FORMAT_DEFINITIONS[format];
  if (Array.isArray(def.gamesPerRound)) {
    return def.gamesPerRound[0]; // Return minimum
  }
  return def.gamesPerRound;
}

export function getGamesPerRoundRange(format: EventFormat): [number, number] {
  const def = FORMAT_DEFINITIONS[format];
  if (Array.isArray(def.gamesPerRound)) {
    return def.gamesPerRound;
  }
  return [def.gamesPerRound, def.gamesPerRound];
}

// ============================================
// DEFAULT SETTINGS FACTORY
// ============================================

export function createDefaultEventSettings(format: EventFormat): EventSettings {
  const def = FORMAT_DEFINITIONS[format];

  return {
    format,
    partnerMode: def.partnerMode,
    scoringType: def.scoringType,
    gamesPerRound: getDefaultGamesPerRound(format),
    seedingMethod: def.seedingMethod,
    numberOfCourts: 1,
    winBy: 2,
    pointsToWin: 11,
    maxRounds: format === 'round_robin' ? 7 : undefined,
    formatOptions: createDefaultFormatOptions(format),
    courtOptimizer: {
      enabled: false,
      minimizeIdleTime: true,
      balancePlaytime: true,
    },
  };
}

function createDefaultFormatOptions(format: EventFormat): FormatOptions {
  switch (format) {
    case 'pool_play':
      return {
        poolCount: 2,
        teamsPerPool: 4,
        advanceFromPool: 2,
        playoffFormat: 'single_elimination',
      };

    case 'bracket':
      return {
        consolationBracket: true,
        thirdPlaceMatch: false,
        seedingFromPools: false,
      };

    case 'mixed_madness':
      return {
        genderBalanceMode: 'strict',
        requireMixedTeams: true,
      };

    case 'scramble':
      return {
        playersPerGroup: 4,
      };

    case 'cream_crop':
      return {
        sortingRounds: 3,
        competitionRounds: 5,
      };

    case 'double_header':
      return {
        gamesPerPartnership: 2,
      };

    case 'king_of_court':
    case 'claim_throne':
      return {
        kingCourtBonus: 1.5,
      };

    case 'milp':
      return {
        matchesPerOpponent: 1,
        autoRotatePartners: true,
      };

    case 'up_down_river':
      return {
        playersMovingUp: 2,
        playersMovingDown: 2,
      };

    default:
      return {};
  }
}

// ============================================
// FORMAT CATEGORIES FOR UI
// ============================================

export const FORMAT_CATEGORIES = [
  {
    id: 'rotating',
    name: 'Rotating Partners',
    description: 'Partners change each game for variety and social mixing',
    formats: getRotatingFormats().map(f => f.id),
  },
  {
    id: 'fixed',
    name: 'Fixed Partners',
    description: 'Teams stay together throughout the event',
    formats: getFixedFormats().map(f => f.id),
  },
  {
    id: 'traditional',
    name: 'Traditional',
    description: 'Classic tournament formats',
    formats: getTraditionalFormats().map(f => f.id),
  },
] as const;
