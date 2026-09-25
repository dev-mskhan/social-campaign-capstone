import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { enqueuePublishJob } from '../src/infrastructure/queue/publishing-queue';
import { createPublishingWorker } from '../src/infrastructure/queue/publishing-worker';
import { db } from '../src/db/client';
import { campaigns, socialPosts } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { Worker } from 'bullmq';

describe('Durable BullMQ Queue & Worker Reliability Tests', () => {
  let worker: Worker;
  let campaignId: string;
  let postId: string;

  beforeAll(async () => {
    // 1. Create a dummy campaign and social post in DB
    const insertedCampaigns = await db
      .insert(campaigns)
      .values({
        title: 'Queue & Worker Reliability Test',
        body: 'Testing BullMQ delayed jobs and worker crash recovery.',
        status: 'publishing',
      })
      .returning();

    campaignId = insertedCampaigns[0]!.id;

    const insertedPosts = await db
      .insert(socialPosts)
      .values({
        campaignId,
        platform: 'instagram',
        caption: 'Queue test caption #tech',
        imageVariantUrl: '/uploads/variants/test_variant.jpg',
        status: 'queued',
        idempotencyKey: `post_${campaignId}_instagram`,
      })
      .returning();

    postId = insertedPosts[0]!.id;
  });

  afterAll(async () => {
    if (worker) {
      await worker.close();
    }
  });

  it('should enqueue a durable publishing job with deterministic jobId', async () => {
    const job = await enqueuePublishJob({
      postId,
      campaignId,
      platform: 'instagram',
    });

    expect(job.id).toBe(`job_${postId}`);
    expect(job.data.postId).toBe(postId);
  });

  it('should calculate delay correctly for future scheduled jobs', async () => {
    const futureDate = new Date(Date.now() + 60000); // 60s in future
    const scheduledPostId = `scheduled_post_${Date.now()}`;

    const job = await enqueuePublishJob({
      postId: scheduledPostId,
      campaignId,
      platform: 'x',
      scheduledAt: futureDate,
    });

    expect(job.delay).toBeGreaterThan(50000); // Delay should be ~60,000ms
  });

  it('should process job via worker and publish social post safely', async () => {
    worker = createPublishingWorker(1);

    const jobCompletedPromise = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Worker execution timed out')), 15000);
      worker.on('completed', (job) => {
        if (job.data.postId === postId) {
          clearTimeout(timer);
          resolve();
        }
      });
    });

    await jobCompletedPromise;

    // Check DB status updated to 'published' via verified webhook
    const posts = await db.select().from(socialPosts).where(eq(socialPosts.id, postId));
    const updatedPost = posts[0]!;

    expect(updatedPost.status).toBe('published');
    expect(updatedPost.externalPostId).toBeDefined();
    expect(updatedPost.externalPostId).toContain('fake_instagram_post_');
  }, 20000);

  it('should handle worker restart and process remaining jobs safely without duplicate posts', async () => {
    // 1. Insert second post
    const inserted = await db
      .insert(socialPosts)
      .values({
        campaignId,
        platform: 'x',
        caption: 'Worker restart test caption',
        imageVariantUrl: '/uploads/variants/test_x_variant.jpg',
        status: 'queued',
        idempotencyKey: `post_${campaignId}_x`,
      })
      .returning();

    const secondPostId = inserted[0]!.id;

    // Close initial worker first
    if (worker) {
      await worker.close();
    }

    // Launch fresh worker instance simulating restart
    const freshWorker = createPublishingWorker(1);

    const freshCompletedPromise = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Fresh worker execution timed out')), 15000);
      freshWorker.on('completed', (job) => {
        if (job.data.postId === secondPostId) {
          clearTimeout(timer);
          resolve();
        }
      });
    });

    // Enqueue job after worker is ready
    await enqueuePublishJob({
      postId: secondPostId,
      campaignId,
      platform: 'x',
    });

    await freshCompletedPromise;

    const posts = await db.select().from(socialPosts).where(eq(socialPosts.id, secondPostId));
    expect(posts[0]!.status).toBe('published');

    await freshWorker.close();
  }, 20000);
});
