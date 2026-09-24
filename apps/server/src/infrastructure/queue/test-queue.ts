import { Queue, Worker, Job } from 'bullmq';
import { redis } from '../redis/client';
import { logger } from '../logger';

export const TEST_QUEUE_NAME = 'phase0-test-queue';

export const testQueue = new Queue(TEST_QUEUE_NAME, {
  connection: redis,
});

export async function addTestJob(message = 'Phase 0 test payload') {
  return await testQueue.add('test-job', { message, timestamp: new Date().toISOString() });
}

export function createTestWorker() {
  const worker = new Worker(
    TEST_QUEUE_NAME,
    async (job: Job) => {
      logger.info(
        { jobId: job.id, name: job.name, data: job.data },
        'Phase 0 test job processed'
      );
      return { status: 'success', processedAt: new Date().toISOString() };
    },
    {
      connection: redis,
    }
  );

  worker.on('completed', (job: Job, returnvalue: unknown) => {
    logger.info({ jobId: job.id, returnvalue }, 'Test job completed successfully');
  });

  worker.on('failed', (job: Job | undefined, error: Error) => {
    logger.error({ jobId: job?.id, error }, 'Test job failed');
  });

  return worker;
}
