import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { getRedis } from '../config/redis.js';
import config from '../config/index.js';
import logger from '../config/logger.js';

const isTest = config.env === 'test';

// Build a rate limiter. Uses Redis-backed store in non-test environments.
// In tests we use in-memory with very high limits to avoid affecting assertions.
const createLimiter = (options = {}) => {
  const limiterConfig = {
    windowMs: config.rateLimit.windowMs,
    max: isTest ? 10000 : (options.max || config.rateLimit.max),
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.ip || 'unknown',
    message: {
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many requests, please try again later',
      },
    },
    handler: (req, res, _next, opts) => {
      logger.warn('Rate limit exceeded', {
        requestId: req.requestId,
        ip: req.ip,
        path: req.path,
      });
      res.status(429).json(opts.message);
    },
  };

  if (!isTest) {
    try {
      const client = getRedis();
      limiterConfig.store = new RedisStore({
        sendCommand: (...args) => client.call(...args),
        prefix: `rl:${options.keyPrefix || 'global'}:`,
      });
    } catch (err) {
      logger.warn('Rate limiter falling back to in-memory store', { error: err.message });
    }
  }

  return rateLimit(limiterConfig);
};

const globalLimiter = createLimiter({ max: config.rateLimit.max, keyPrefix: 'global' });
const authLimiter = createLimiter({ max: config.rateLimit.authMax, keyPrefix: 'auth' });
const paymentLimiter = createLimiter({ max: config.rateLimit.paymentMax, keyPrefix: 'payment' });

export { globalLimiter, authLimiter, paymentLimiter };
