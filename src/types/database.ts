/**
 * Database Types for Tournament Formats
 * Mirrors the Supabase schema for TypeScript type safety
 */

import type {
  EventFormat,
  PartnerMode,
  ScoringType,
  SeedingMethod,
  MatchStatus,
  PlayerGender,
  EventSettings,
} from './formats';

// ============================================
// BASE TYPES
// ============================================

export interface Tournament {
  id: string;
  name: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  location?: string;
  organizer_id?: string;
  status: 'draft' | 'published' | 'active' | 'completed' | 'cancelled';
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface TournamentEvent {
  id: string;
  tournament_id?: string;
  name: string;
  format: EventFormat;
  partner_mode: PartnerMode;
  scoring_type: ScoringType;
  seeding_method: SeedingMethod;
  games_per_round: number;
  number_of_courts: number;
  min_players: number;
  max_players?: number;
  settings: EventSettings;
  status: 'pending' | 'registration' | 'active' | 'completed' | 'cancelled';
  current_round: number;
  created_at: string;
  updated_at: string;
}

export interface Registration {
  id: string;
  tournament_event_id: string;
  player_name: string;
  player_email?: string;
  player_id?: string;
  rating?: number;
  seed?: number;
  gender?: PlayerGender;
  team_id?: string;
  partner_id?: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'waitlist';
  checked_in: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ============================================
// ROTATING PARTNER FORMAT TYPES
// ============================================

export interface RoundGame {
  id: string;
  tournament_event_id: string;
  round: number;
  game_number: number;
  court_number: number;

  // 4 players per game
  player1_id?: string;
  player2_id?: string;
  player3_id?: string;
  player4_id?: string;

  // Team assignments
  team1_players: string[];
  team2_players: string[];

  // Scores
  team1_score?: number;
  team2_score?: number;

  // Status
  status: MatchStatus;
  started_at?: string;
  completed_at?: string;

  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CumulativeStanding {
  id: string;
  tournament_event_id: string;
  registration_id: string;

  // Game statistics
  games_played: number;
  games_won: number;
  games_lost: number;

  // Points statistics
  points_for: number;
  points_against: number;
  point_differential: number;

  // Calculated metrics
  court_weighted_points: number;
  win_percentage: number;
  average_point_differential: number;

  // Current position
  current_court?: number;
  current_rank?: number;
  previous_rank?: number;

  // Streak tracking
  current_streak: number;
  best_streak: number;

  // Round data
  rounds_played: number;
  byes_taken: number;

  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CourtWeight {
  id: string;
  tournament_event_id: string;
  court_number: number;
  weight: number;
  name?: string;
  description?: string;
  created_at: string;
}

export interface PartnershipHistory {
  id: string;
  tournament_event_id: string;
  player1_id: string;
  player2_id: string;
  games_together: number;
  wins_together: number;
  last_round_together?: number;
  created_at: string;
  updated_at: string;
}

export interface OpponentHistory {
  id: string;
  tournament_event_id: string;
  player1_id: string;
  player2_id: string;
  games_against: number;
  wins_against: number;
  last_round_against?: number;
  created_at: string;
  updated_at: string;
}

// ============================================
// FIXED PARTNER FORMAT TYPES
// ============================================

export interface Team {
  id: string;
  tournament_event_id: string;
  name?: string;
  seed?: number;
  rating?: number;
  pool_id?: string;
  bracket_position?: number;
  status: 'active' | 'eliminated' | 'withdrew';
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  registration_id: string;
  role: 'player' | 'captain' | 'substitute';
  created_at: string;
}

export interface Pool {
  id: string;
  tournament_event_id: string;
  name: string;
  pool_number: number;
  size: number;
  created_at: string;
}

export interface PoolStanding {
  id: string;
  pool_id: string;
  team_id: string;
  games_played: number;
  games_won: number;
  games_lost: number;
  points_for: number;
  points_against: number;
  point_differential: number;
  rank_in_pool?: number;
  advances_to_bracket: boolean;
  created_at: string;
  updated_at: string;
}

export interface BracketMatch {
  id: string;
  tournament_event_id: string;
  bracket_type: 'main' | 'consolation' | 'winners' | 'losers';
  round: number;
  match_number: number;
  court_number?: number;

  // Teams
  team1_id?: string;
  team2_id?: string;

  // Seeding placeholders
  team1_seed?: number;
  team2_seed?: number;
  team1_source?: string;
  team2_source?: string;

  // Scores
  team1_scores: number[];
  team2_scores: number[];
  team1_games_won: number;
  team2_games_won: number;

  // Bracket progression
  winner_advances_to?: string;
  loser_drops_to?: string;

  // Status
  status: MatchStatus;
  winner_team_id?: string;
  scheduled_time?: string;
  started_at?: string;
  completed_at?: string;

  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ============================================
// VIEW TYPES
// ============================================

export interface CurrentStandingView extends CumulativeStanding {
  player_name: string;
  rating?: number;
  format: EventFormat;
  scoring_type: ScoringType;
  calculated_rank: number;
}

export interface RoundSummary {
  tournament_event_id: string;
  round: number;
  total_games: number;
  completed_games: number;
  in_progress_games: number;
  courts_used: number;
}

// ============================================
// INSERT/UPDATE TYPES
// ============================================

export type TournamentInsert = Omit<Tournament, 'id' | 'created_at' | 'updated_at'>;
export type TournamentUpdate = Partial<TournamentInsert>;

export type TournamentEventInsert = Omit<TournamentEvent, 'id' | 'created_at' | 'updated_at'>;
export type TournamentEventUpdate = Partial<TournamentEventInsert>;

export type RegistrationInsert = Omit<Registration, 'id' | 'created_at' | 'updated_at'>;
export type RegistrationUpdate = Partial<RegistrationInsert>;

export type RoundGameInsert = Omit<RoundGame, 'id' | 'created_at' | 'updated_at'>;
export type RoundGameUpdate = Partial<RoundGameInsert>;

export type TeamInsert = Omit<Team, 'id' | 'created_at' | 'updated_at'>;
export type TeamUpdate = Partial<TeamInsert>;

export type BracketMatchInsert = Omit<BracketMatch, 'id' | 'created_at' | 'updated_at'>;
export type BracketMatchUpdate = Partial<BracketMatchInsert>;

// ============================================
// JOINED/ENRICHED TYPES
// ============================================

export interface RoundGameWithPlayers extends RoundGame {
  player1?: Registration;
  player2?: Registration;
  player3?: Registration;
  player4?: Registration;
}

export interface StandingWithPlayer extends CumulativeStanding {
  player: Registration;
}

export interface TeamWithMembers extends Team {
  members: (TeamMember & { registration: Registration })[];
}

export interface BracketMatchWithTeams extends BracketMatch {
  team1?: TeamWithMembers;
  team2?: TeamWithMembers;
  winner_team?: TeamWithMembers;
}

export interface PoolWithStandings extends Pool {
  standings: (PoolStanding & { team: TeamWithMembers })[];
}

// ============================================
// CLIENT-SIDE TYPES (for localStorage mode)
// ============================================

export interface LocalPlayer {
  id: string;
  name: string;
  gender?: PlayerGender;
  rating?: number;
  // Set-partner formats: the id of this player's fixed partner. Present only
  // while the two are a paired team; absent for players still in the pool.
  partnerId?: string;
  // First round this player could appear in: 1 for everyone present at start,
  // currentRound+1 for mid-session arrivals. Lets bye rows tell "sitting out"
  // from "hadn't arrived yet". Absent on legacy sessions — callers fall back
  // to inferring presence from the first round the player has a game in.
  joinedRound?: number;
  // DUPR integration fields
  duprId?: string;
  duprRating?: number;
  duprSinglesRating?: number;
  duprProvisional?: boolean;
  duprImageUrl?: string;
  duprVerified?: boolean;
}

export interface LocalRoundGame {
  id: string;
  round: number;
  gameNumber: number;
  courtNumber: number;
  team1: [LocalPlayer, LocalPlayer];
  team2: [LocalPlayer, LocalPlayer];
  team1Score?: number;
  team2Score?: number;
  completed: boolean;
}

export interface LocalStanding {
  player: LocalPlayer;
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDifferential: number;
  courtWeightedPoints: number;
  winPercentage: number;
  currentCourt?: number;
  currentRank: number;
}

export interface LocalTournamentState {
  id: string;
  name: string;
  format: EventFormat;
  settings: EventSettings;
  players: LocalPlayer[];
  games: LocalRoundGame[];
  standings: LocalStanding[];
  currentRound: number;
  status: 'setup' | 'active' | 'completed';
  createdAt: string;
  updatedAt: string;
}
