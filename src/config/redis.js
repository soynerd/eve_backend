import Redis from 'ioredis';
import config from './index.js';
import logger from './logger.js';

let redis = null;

function getRedis() {
  if (redis) return redis;

  redis = new Redis(config.redis.url, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 3) {
        logger.warn('Redis connection failed after retries, operating without cache');
        return null;
      }
      return Math.min(times * 200, 1000);
    },
    enableOfflineQueue: true,
    lazyConnect: true,
  });

  redis.on('error', (err) => {
    logger.warn('Redis error', { error: err.message });
  });

  redis.on('connect', () => {
    logger.info('Redis connected');
  });

  // Connect asynchronously without blocking app startup.
  redis.connect().catch((err) => {
    logger.warn('Redis initial connect failed', { error: err.message });
  });

  return redis;
}

export { getRedis };
