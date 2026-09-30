import logger from '../config/logger.js';
import { AppError } from '../utils/errors.js';

// Global error handler - must be registered last as an Express error middleware.
// Operational errors (AppError subclasses) produce clean JSON responses.
// Unexpected errors are logged with stack traces but return a generic 500.
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, _next) => {
  const requestId = req.requestId;

  if (err.isOperational) {
    const body = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
    };
    if (err.details) body.error.details = err.details;

    logger.warn('Operational error', {
      requestId,
      code: err.code,
      status: err.statusCode,
      message: err.message,
      path: req.path,
    });

    return res.status(err.statusCode).json(body);
  }

  // Prisma unique constraint violation
  if (err.code === 'P2002') {
    logger.warn('Unique constraint violation', { requestId, meta: err.meta });
    return res.status(409).json({
      success: false,
      error: { code: 'CONFLICT', message: 'A record with this data already exists' },
    });
  }

  // Prisma record not found
  if (err.code === 'P2025') {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Resource not found' },
    });
  }

  logger.error('Unexpected error', {
    requestId,
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  return res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
  });
};

export { errorHandler };
