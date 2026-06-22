/**
 * DUPR API Configuration
 *
 * Set your DUPR API credentials here or via environment variables
 */

export const DUPR_CONFIG = {
  // Environment: 'uat' | 'production'
  environment: (process.env.NEXT_PUBLIC_DUPR_ENV || 'uat') as 'uat' | 'production',

  // Client credentials (from DUPR Account Manager)
  clientKey: process.env.NEXT_PUBLIC_DUPR_CLIENT_KEY || '',
  clientSecret: process.env.DUPR_CLIENT_SECRET || '', // Server-side only

  // API endpoints
  endpoints: {
    uat: {
      api: 'https://api.uat.dupr.gg',
      auth: 'https://uat.mydupr.com/api',
      login: 'https://uat.dupr.gg/login-external-app',
    },
    production: {
      api: 'https://api.dupr.gg',
      auth: 'https://prod.mydupr.com/api',
      login: 'https://dashboard.dupr.com/login-external-app',
    },
  },
};

export function getDuprEndpoints() {
  return DUPR_CONFIG.endpoints[DUPR_CONFIG.environment];
}

export function getEncodedClientId(): string {
  if (!DUPR_CONFIG.clientKey) {
    console.warn('DUPR client key not configured');
    return '';
  }
  // Base64 encode the client ID for the login iframe URL
  return btoa(DUPR_CONFIG.clientKey);
}

export function getAuthorizationHeader(): string {
  if (!DUPR_CONFIG.clientKey || !DUPR_CONFIG.clientSecret) {
    throw new Error('DUPR credentials not configured');
  }
  // Base64 encode clientKey:clientSecret for API auth
  return btoa(`${DUPR_CONFIG.clientKey}:${DUPR_CONFIG.clientSecret}`);
}
