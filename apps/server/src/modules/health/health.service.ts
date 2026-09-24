import { checkDatabaseConnection } from '../../db/client';
import { checkRedisConnection } from '../../infrastructure/redis/client';

export interface ReadinessResult {
  status: 'ready' | 'not_ready';
  timestamp: string;
  dependencies: {
    database: 'up' | 'down';
    redis: 'up' | 'down';
  };
}

export class HealthService {
  public getLiveness(): { status: 'ok'; timestamp: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  public async getReadiness(): Promise<ReadinessResult> {
    const [isDbUp, isRedisUp] = await Promise.all([
      checkDatabaseConnection(),
      checkRedisConnection(),
    ]);

    const isReady = isDbUp && isRedisUp;

    return {
      status: isReady ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      dependencies: {
        database: isDbUp ? 'up' : 'down',
        redis: isRedisUp ? 'up' : 'down',
      },
    };
  }
}

export const healthService = new HealthService();
