'use strict';

const REQUIRED_ENV_VARS = [
  'PORT',
  'MONGODB_URI',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'CLIENT_URL',
];

/**
 * Validates that all required environment variables are present.
 * Throws an Error listing any missing variables.
 * Call this early in application startup (after dotenv.config()).
 */
const validateEnv = () => {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }
};

module.exports = { validateEnv };
