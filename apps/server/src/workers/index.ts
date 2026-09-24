import { createTestWorker } from '../infrastructure/queue/test-queue';
import { createContentWorker } from '../infrastructure/queue/content-queue';
import { closeRedisConnection } from '../infrastructure/redis/client';
import { logger } from '../infrastructure/logger';

async function startWorker() {
  logger.info('🚀 Starting BullMQ background worker process...');

  const testWorker = createTestWorker();
  const contentWorker = createContentWorker();

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutting down workers gracefully...');
    try {
      await testWorker.close();
      await contentWorker.close();
      await closeRedisConnection();
      logger.info('Worker process shut down cleanly.');
      process.exit(0);
    } catch (error) {
      logger.error({ error }, 'Error during worker shutdown');
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  logger.info('✅ Background workers listening for jobs.');
}

startWorker().catch((error) => {
  logger.error({ error }, 'Worker process crashed on startup');
  process.exit(1);
});
