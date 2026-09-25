import { describe, it, expect, afterAll } from 'vitest';
import { checkDatabaseConnection, closeDatabaseConnection } from '../src/db/client';
import { checkRedisConnection, closeRedisConnection } from '../src/infrastructure/redis/client';
import { testQueue, addTestJob, createTestWorker } from '../src/infrastructure/queue/test-queue';

describe('Database, Redis, & BullMQ Infrastructure Tests', () => {
  afterAll(async () => {
    await closeDatabaseConnection();
    await closeRedisConnection();
  });

  it('should connect to PostgreSQL database successfully', async () => {
    const isDbConnected = await checkDatabaseConnection();
    expect(isDbConnected).toBe(true);
  });

  it('should connect to Redis server successfully', async () => {
    const isRedisConnected = await checkRedisConnection();
    expect(isRedisConnected).toBe(true);
  });

  it('should push a test job to BullMQ queue and process it via worker', async () => {
    await testQueue.drain();
    const testMessage = `Phase 0 automated integration test job ${Date.now()}`;
    const worker = createTestWorker();

    const jobCompletedPromise = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Test worker execution timed out')), 10000);
      worker.on('completed', (j) => {
        if (j.data?.message === testMessage) {
          clearTimeout(timer);
          resolve();
        }
      });
    });

    const job = await addTestJob(testMessage);
    expect(job.id).toBeDefined();

    await jobCompletedPromise;
    await worker.close();
  });
});
