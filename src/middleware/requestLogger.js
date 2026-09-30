import { v4 as uuidv4 } from 'uuid';
import logger from '../config/logger.js';

// Attaches a unique request ID to every request for tracing.
// Also logs incoming requests and their completion with timing.
const requestLogger = (req, res, next) => {
  req.requestId = uuidv4();
  const start = Date.now();

  res.on('finish', () => {
    logger.info('Request completed', {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: Date.now() - start,
      userId: req.user?.id,
    });
  });

  next();
};

export { requestLogger };
