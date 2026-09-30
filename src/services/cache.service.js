import { getRedis } from '../config/redis.js';
import logger from '../config/logger.js';
import config from '../config/index.js';

// Safe cache wrapper. All errors are caught and logged so cache failures
// never propagate to the caller.

const tryGet = async (key) => {
  try {
    const client = getRedis();
    const value = await client.get(key);
    return value ? JSON.parse(value) : null;
  } catch (err) {
    logger.warn('Cache get failed', { key, error: err.message });
    return null;
  }
};

const trySet = async (key, value, ttl) => {
  try {
    const client = getRedis();
    await client.set(key, JSON.stringify(value), 'EX', ttl);
  } catch (err) {
    logger.warn('Cache set failed', { key, error: err.message });
  }
};

const tryDelete = async (...keys) => {
  try {
    const client = getRedis();
    if (keys.length > 0) await client.del(...keys);
  } catch (err) {
    logger.warn('Cache delete failed', { keys, error: err.message });
  }
};

// Delete all keys matching a pattern. Used for list cache invalidation.
const tryDeletePattern = async (pattern) => {
  try {
    const client = getRedis();
    const keys = await client.keys(pattern);
    if (keys.length > 0) await client.del(...keys);
  } catch (err) {
    logger.warn('Cache pattern delete failed', { pattern, error: err.message });
  }
};

const KEYS = {
  centre: (id) => `centre:${id}`,
  centreList: (page, limit) => `centres:list:${page}:${limit}`,
  centreTests: (id) => `centre:${id}:tests`,
  test: (id) => `test:${id}`,
  testList: (page, limit) => `tests:list:${page}:${limit}`,
  testCentres: (id) => `test:${id}:centres`,
};

const TTL = {
  centres: config.cache.ttlCentres,
  tests: config.cache.ttlTests,
};

export { tryGet, trySet, tryDelete, tryDeletePattern, KEYS, TTL };
