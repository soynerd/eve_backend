import app from './app.js';
import config from './config/index.js';
import logger from './config/logger.js';
import prisma from './config/prisma.js';

const server = app.listen(config.port, () => {
  logger.info(`EVE Healthcare API started`, {
    port: config.port,
    env: config.env,
    docs: `http://localhost:${config.port}/api-docs`,
  });
});

// Graceful shutdown
const shutdown = async (signal) => {
  logger.info(`${signal} received, shutting down gracefully`);
  server.close(async () => {
    await prisma.$disconnect();
    logger.info('Server closed');
    process.exit(0);
  });

  // Force exit if graceful shutdown takes too long
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', { reason: String(reason) });
});
