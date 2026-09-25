import { Worker, Job } from 'bullmq';
import { redis } from '../redis/client';
import { PUBLISHING_QUEUE_NAME, PublishJobData } from './publishing-queue';
import { publishingService } from '../../modules/publishing/publishing.service';
import { db } from '../../db/client';
import { socialPosts } from '../../db/schema/social-posts';
import { eq } from 'drizzle-orm';
import { logger } from '../logger';

/**
 * Factory function creating a durable BullMQ worker for social post publishing.
 */
export function createPublishingWorker(concurrency = 5): Worker<PublishJobData> {
  const worker = new Worker<PublishJobData>(
    PUBLISHING_QUEUE_NAME,
    async (job: Job<PublishJobData>) => {
      const { postId, campaignId, platform } = job.data;

      logger.info(
        { jobId: job.id, postId, campaignId, platform, attempt: job.attemptsMade },
        'BullMQ publishing worker picked up job'
      );

      // 1. Fetch current post state from database (source of truth)
      const posts = await db.select().from(socialPosts).where(eq(socialPosts.id, postId));
      const post = posts[0];

      if (!post) {
        logger.warn({ postId, jobId: job.id }, 'Post not found in DB during worker execution — skipping job');
        return { status: 'skipped', reason: 'not_found' };
      }

      // If already published, skip execution safely
      if (post.status === 'published') {
        logger.info({ postId, externalPostId: post.externalPostId }, 'Post is already published — skipping worker job');
        return { status: 'already_published', externalPostId: post.externalPostId };
      }

      // 2. Execute publishing service (preserves idempotency key & 429 backoff)
      const result = await publishingService.publishPost(postId);

      logger.info(
        { jobId: job.id, postId, externalPostId: result.externalPostId },
        'Worker successfully published post via SocialPublisher'
      );

      return {
        status: 'success',
        externalPostId: result.externalPostId,
        publishedAt: result.publishedAt,
      };
    },
    {
      connection: redis,
      concurrency,
    }
  );

  worker.on('completed', (job: Job<PublishJobData>, returnvalue: unknown) => {
    logger.info({ jobId: job.id, returnvalue }, 'Publishing worker job completed successfully');
  });

  worker.on('failed', (job: Job<PublishJobData> | undefined, error: Error) => {
    logger.error(
      { jobId: job?.id, postId: job?.data?.postId, error: error.message },
      'Publishing worker job failed'
    );
  });

  return worker;
}
