import { env } from './env';

export const config = {
  env: env.NODE_ENV,
  isDev: env.NODE_ENV === 'development',
  isProd: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',
  server: {
    port: env.PORT,
    host: env.HOST,
    apiPrefix: env.API_PREFIX,
  },
  db: {
    url: env.DATABASE_URL,
  },
  redis: {
    url: env.REDIS_URL,
  },
  logger: {
    level: env.LOG_LEVEL,
  },
} as const;

export type Config = typeof config;
