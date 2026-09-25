import { Queue } from 'bullmq';
import { redis } from '../redis/client';
import { logger } from '../logger';

export interface PublishJobData {
  postId: string;
  campaignId: string;
  platform: string;
}

export const PUBLISHING_QUEUE_NAME = 'publishing-jobs';

export const publishingQueue = new Queue<PublishJobData>(PUBLISHING_QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: 100,
    removeOnFail: 200,
  },
});

export interface EnqueuePublishOptions {
  postId: string;
  campaignId: string;
  platform: string;
  scheduledAt?: Date | string | null;
}

/**
 * Enqueues a social post publication job in BullMQ with optional delay.
 * Reuses deterministic jobId (`job_${postId}`) to ensure duplicate enqueue requests are idempotent.
 */
export async function enqueuePublishJob(options: EnqueuePublishOptions) {
  let delay = 0;

  if (options.scheduledAt) {
    const scheduledDate = new Date(options.scheduledAt);
    const now = Date.now();
    if (scheduledDate.getTime() > now) {
      delay = scheduledDate.getTime() - now;
    }
  }

  const jobId = `job_${options.postId}`;

  const job = await publishingQueue.add(
    'publish-post',
    {
      postId: options.postId,
      campaignId: options.campaignId,
      platform: options.platform,
    },
    {
      delay,
      jobId,
    }
  );

  logger.info(
    {
      jobId: job.id,
      postId: options.postId,
      campaignId: options.campaignId,
      platform: options.platform,
      delayMs: delay,
      scheduledAt: options.scheduledAt,
    },
    'Enqueued durable publishing job in BullMQ'
  );

  return job;
}
