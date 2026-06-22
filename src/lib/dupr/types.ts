/**
 * DUPR API Types
 */

// DUPR Rating information
export interface DuprRating {
  doubles: number | null;
  singles: number | null;
  doublesProvisional: boolean;
  singlesProvisional: boolean;
}

// DUPR User stats from login event
export interface DuprStats {
  doublesRating?: number;
  singlesRating?: number;
  doublesProvisional?: boolean;
  singlesProvisional?: boolean;
  matchesPlayed?: number;
  wins?: number;
  losses?: number;
}

// DUPR Login event data (from iframe postMessage)
export interface DuprLoginEvent {
  userToken: string;
  refreshToken: string;
  id: string; // Internal user ID
  duprId: string; // Public DUPR ID (e.g., "12345678")
  stats: DuprStats;
  firstName?: string;
  lastName?: string;
  email?: string;
  imageUrl?: string;
}

// DUPR User profile from API
export interface DuprUserProfile {
  id: string;
  duprId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email?: string;
  imageUrl?: string;
  ratings: DuprRating;
  age?: number;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  location?: {
    city?: string;
    state?: string;
    country?: string;
  };
  club?: {
    id: string;
    name: string;
  };
}

// DUPR Search result
export interface DuprSearchResult {
  id: string;
  duprId: string;
  fullName: string;
  imageUrl?: string;
  ratings: DuprRating;
  location?: string;
}

// Webhook topics
export type DuprWebhookTopic = 'LOGIN' | 'MATCH_RESULT' | 'RATING_UPDATE';

// Webhook registration payload
export interface DuprWebhookRegistration {
  clientId: string;
  webhookUrl: string;
  topics: DuprWebhookTopic[];
}

// API Response wrapper
export interface DuprApiResponse<T> {
  status: 'SUCCESS' | 'ERROR';
  message?: string;
  result: T;
}

// Token response from /token endpoint
export interface DuprTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

// Player with DUPR info (compatible with LocalPlayer from database.ts)
export interface DuprPlayer {
  id: string;
  name: string;
  duprId?: string;
  duprRating?: number; // Doubles rating (primary for pickleball)
  duprSinglesRating?: number;
  duprProvisional?: boolean;
  duprImageUrl?: string;
  duprVerified?: boolean; // True if logged in via DUPR
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  rating?: number; // Can be set manually or from DUPR
}

// Type guard to check if a player has DUPR data
export function isDuprPlayer(player: unknown): player is DuprPlayer {
  return typeof player === 'object' && player !== null && 'duprId' in player;
}
