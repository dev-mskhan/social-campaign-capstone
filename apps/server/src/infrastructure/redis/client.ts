import { Redis } from 'ioredis';
import { config } from '../../config/config';
import { logger } from '../logger';

export const redisConnectionOptions = {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

export const redis = new Redis(config.redis.url, redisConnectionOptions);

redis.on('connect', () => {
  logger.info('Connected to Redis server.');
});

redis.on('error', (error) => {
  logger.error({ error }, 'Redis connection error.');
});

export async function checkRedisConnection(): Promise<boolean> {
  try {
    const pong = await redis.ping();
    return pong === 'PONG';
  } catch (error) {
    logger.error({ error }, 'Redis health check ping failed.');
    return false;
  }
}

export async function closeRedisConnection(): Promise<void> {
  logger.info('Closing Redis connection...');
  await redis.quit();
}
