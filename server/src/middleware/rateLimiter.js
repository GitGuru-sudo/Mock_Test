'use strict';

const rateLimit = require('express-rate-limit');

// Using in-memory rate limiting (no Redis needed for rate limiting).
// @upstash/redis is an HTTP client and is NOT compatible with rate-limit-redis
// which expects a native TCP Redis client (ioredis/node-redis).
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many login attempts. Please try again after 15 minutes.',
    });
  },
});

module.exports = loginRateLimiter;
