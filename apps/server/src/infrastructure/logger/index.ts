import pino from 'pino';
import { config } from '../../config/config';

export const pinoLoggerOptions: pino.LoggerOptions = {
  level: config.logger.level,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers["x-api-key"]',
      '*.password',
      '*.token',
      '*.accessToken',
      '*.refreshToken',
      '*.secret',
      '*.encryptionKey',
      '*.key',
      '*.authorization',
      'body.password',
      'body.token',
      'body.secret',
    ],
    remove: false,
    censor: '[REDACTED]',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  transport: config.isDev
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
};

export const logger = pino(pinoLoggerOptions);
