import winston from 'winston';
import config from './index.js';

const { combine, timestamp, json, colorize, simple, errors } = winston.format;

const logger = winston.createLogger({
  level: config.env === 'production' ? 'info' : 'debug',
  format: combine(
    errors({ stack: true }),
    timestamp(),
    json()
  ),
  defaultMeta: { service: 'eve-healthcare' },
  transports: [
    new winston.transports.Console({
      format: config.env === 'development'
        ? combine(colorize(), simple())
        : combine(timestamp(), json()),
      silent: config.env === 'test',
    }),
  ],
});

export default logger;
