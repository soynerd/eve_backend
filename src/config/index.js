// Load .env. If the IDE has already injected vars, dotenv won't override them
// (override defaults to false). This ensures TEST_DATABASE_URL is always
// available when running tests without a prior env setup.
import 'dotenv/config';

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),

  db: {
    url: process.env.NODE_ENV === 'test'
      ? process.env.TEST_DATABASE_URL
      : process.env.DATABASE_URL,
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'fallback-secret-do-not-use-in-prod',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    authMax: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '10', 10),
    paymentMax: parseInt(process.env.PAYMENT_RATE_LIMIT_MAX || '20', 10),
  },

  cache: {
    ttlCentres: parseInt(process.env.CACHE_TTL_CENTRES || '300', 10),
    ttlTests: parseInt(process.env.CACHE_TTL_TESTS || '300', 10),
  },

  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },
};

export default config;
