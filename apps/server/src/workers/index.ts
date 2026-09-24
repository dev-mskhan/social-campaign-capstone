import { createTestWorker } from '../infrastructure/queue/test-queue';
import { closeRedisConnection } from '../infrastructure/redis/client';
import { logger } from '../infrastructure/logger';

async function startWorker() {
  logger.info('🚀 Starting BullMQ background worker...');

  const worker = createTestWorker();

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutting down worker gracefully...');
    try {
      await worker.close();
      await closeRedisConnection();
      logger.info('Worker shut down cleanly.');
      process.exit(0);
    } catch (error) {
      logger.error({ error }, 'Error during worker shutdown');
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  logger.info('✅ Background worker is listening for jobs.');
}

startWorker().catch((error) => {
  logger.error({ error }, 'Worker process crashed on startup');
  process.exit(1);
});
