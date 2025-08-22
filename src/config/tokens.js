/**
 * Token types and configurations
 */

export const tokenTypes = {
  ACCESS: 'access',
  REFRESH: 'refresh',
  RESET_PASSWORD: 'resetPassword',
  VERIFY_EMAIL: 'verifyEmail',
};

// Token expiration times in seconds
export const tokenExpiration = {
  ACCESS: 15 * 60,           // 15 minutes
  REFRESH: 7 * 24 * 60 * 60, // 7 days
  RESET_PASSWORD: 10 * 60,   // 10 minutes
  VERIFY_EMAIL: 24 * 60 * 60, // 24 hours
};

import jwtConfig from './jwt.config.js';

// Use the same secret for all token types to ensure consistency
export const tokenSecrets = {
  ACCESS: jwtConfig.accessSecret,
  REFRESH: jwtConfig.refreshSecret,
  RESET_PASSWORD: jwtConfig.secret,
  VERIFY_EMAIL: jwtConfig.secret,
};

export default {
  tokenTypes,
  tokenExpiration,
  tokenSecrets,
};
