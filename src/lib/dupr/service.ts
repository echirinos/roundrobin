/**
 * DUPR API Service
 *
 * Handles authentication and API calls to DUPR
 */

import { getDuprEndpoints, getAuthorizationHeader, DUPR_CONFIG } from './config';
import type {
  DuprApiResponse,
  DuprTokenResponse,
  DuprUserProfile,
  DuprSearchResult,
  DuprWebhookRegistration,
} from './types';

// Cache for partner access token
let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * Get a partner access token for API calls
 * Tokens are valid for 1 hour and can be cached
 */
export async function getPartnerToken(): Promise<string> {
  // Return cached token if still valid (with 5 min buffer)
  if (cachedToken && cachedToken.expiresAt > Date.now() + 5 * 60 * 1000) {
    return cachedToken.token;
  }

  const endpoints = getDuprEndpoints();

  try {
    const response = await fetch(`${endpoints.auth}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-authorization': getAuthorizationHeader(),
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get DUPR token: ${response.status}`);
    }

    const data: DuprTokenResponse = await response.json();

    // Cache the token
    cachedToken = {
      token: data.accessToken,
      expiresAt: Date.now() + data.expiresIn * 1000,
    };

    return data.accessToken;
  } catch (error) {
    console.error('Error getting DUPR partner token:', error);
    throw error;
  }
}

/**
 * Get user profile by DUPR ID
 */
export async function getUserByDuprId(
  duprId: string,
  userToken?: string
): Promise<DuprUserProfile | null> {
  const endpoints = getDuprEndpoints();
  const token = userToken || (await getPartnerToken());

  try {
    const response = await fetch(`${endpoints.api}/player/v1.0/player/${duprId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Failed to get user: ${response.status}`);
    }

    const data: DuprApiResponse<DuprUserProfile> = await response.json();
    return data.result;
  } catch (error) {
    console.error('Error fetching DUPR user:', error);
    return null;
  }
}

/**
 * Get basic user info (using user's own token)
 */
export async function getBasicUserInfo(userToken: string): Promise<DuprUserProfile | null> {
  const endpoints = getDuprEndpoints();

  try {
    const response = await fetch(`${endpoints.api}/player/v1.0/me`, {
      headers: {
        Authorization: `Bearer ${userToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get user info: ${response.status}`);
    }

    const data: DuprApiResponse<DuprUserProfile> = await response.json();
    return data.result;
  } catch (error) {
    console.error('Error fetching basic user info:', error);
    return null;
  }
}

/**
 * Search for players by name
 */
export async function searchPlayers(
  query: string,
  limit: number = 10
): Promise<DuprSearchResult[]> {
  const endpoints = getDuprEndpoints();
  const token = await getPartnerToken();

  try {
    const response = await fetch(
      `${endpoints.api}/player/v1.0/search?query=${encodeURIComponent(query)}&limit=${limit}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Search failed: ${response.status}`);
    }

    const data: DuprApiResponse<{ players: DuprSearchResult[] }> = await response.json();
    return data.result.players || [];
  } catch (error) {
    console.error('Error searching DUPR players:', error);
    return [];
  }
}

/**
 * Register a webhook for DUPR events
 */
export async function registerWebhook(
  webhookUrl: string,
  topics: DuprWebhookRegistration['topics']
): Promise<boolean> {
  const endpoints = getDuprEndpoints();
  const token = await getPartnerToken();

  try {
    const response = await fetch(`${endpoints.api}/api/v1.0/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        clientId: DUPR_CONFIG.clientKey,
        webhookUrl,
        topics,
      } as DuprWebhookRegistration),
    });

    if (!response.ok) {
      throw new Error(`Webhook registration failed: ${response.status}`);
    }

    const data: DuprApiResponse<unknown> = await response.json();
    return data.status === 'SUCCESS';
  } catch (error) {
    console.error('Error registering webhook:', error);
    return false;
  }
}

/**
 * Validate a DUPR ID format
 * DUPR IDs are typically 8-digit numbers
 */
export function isValidDuprId(duprId: string): boolean {
  return /^\d{6,10}$/.test(duprId);
}

/**
 * Format DUPR rating for display
 */
export function formatDuprRating(rating: number | null | undefined, provisional?: boolean): string {
  if (rating === null || rating === undefined) return 'N/R';
  const formatted = rating.toFixed(2);
  return provisional ? `${formatted}*` : formatted;
}

/**
 * Get rating tier/level from DUPR rating
 */
export function getDuprTier(rating: number): string {
  if (rating >= 6.0) return 'Pro';
  if (rating >= 5.5) return 'Advanced+';
  if (rating >= 5.0) return 'Advanced';
  if (rating >= 4.5) return 'Intermediate+';
  if (rating >= 4.0) return 'Intermediate';
  if (rating >= 3.5) return 'Beginner+';
  if (rating >= 3.0) return 'Beginner';
  return 'Newcomer';
}

/**
 * Get rating color class for UI
 */
export function getDuprRatingColor(rating: number): string {
  if (rating >= 5.5) return 'text-purple-600 dark:text-purple-400';
  if (rating >= 5.0) return 'text-blue-600 dark:text-blue-400';
  if (rating >= 4.5) return 'text-green-600 dark:text-green-400';
  if (rating >= 4.0) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-muted-foreground';
}
