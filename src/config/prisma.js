import { PrismaClient } from '@prisma/client';
import config from './index.js';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: config.db.url,
    },
  },
  log: config.env === 'development' ? ['warn', 'error'] : ['error'],
});

export default prisma;
