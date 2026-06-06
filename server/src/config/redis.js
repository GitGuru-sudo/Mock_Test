'use strict';

const { Redis } = require('@upstash/redis');

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

let redis;

if (!url || !token) {
  console.warn(
    'Warning: UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN is not set. ' +
      'Redis client will not be initialized. Caching features will be unavailable.'
  );
  redis = null;
} else {
  redis = new Redis({ url, token });
}

module.exports = redis;
