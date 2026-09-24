import { describe, it, expect, afterAll } from 'vitest';
import { checkDatabaseConnection, closeDatabaseConnection } from '../src/db/client';
import { checkRedisConnection, closeRedisConnection } from '../src/infrastructure/redis/client';
import { addTestJob, createTestWorker } from '../src/infrastructure/queue/test-queue';

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
    const worker = createTestWorker();

    let processedJobId: string | undefined;

    const jobProcessedPromise = new Promise<void>((resolve) => {
      worker.on('completed', (job) => {
        processedJobId = job.id;
        resolve();
      });
    });

    const job = await addTestJob('Phase 0 automated integration test job');
    expect(job.id).toBeDefined();

    await jobProcessedPromise;
    expect(processedJobId).toBe(job.id);

    await worker.close();
  });
});
