import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app/app';
import { db } from '../src/db/client';
import { campaigns, socialPosts } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { generateWebhookSignature } from '../src/infrastructure/security/webhook-signature';
import { config } from '../src/config/config';

describe('Phase 4 Status Trust Rule & Delivery Verification Tests', () => {
  let app: FastifyInstance;
  let campaignId: string;
  let postId: string;
  let externalPostId: string;
  let idempotencyKey: string;

  beforeAll(async () => {
    app = buildApp({ logger: false });
    await app.ready();

    // 1. Insert campaign and social post directly into DB without enqueuing background worker jobs
    const insertedCampaigns = await db
      .insert(campaigns)
      .values({
        title: 'Status Trust Rule Test Campaign',
        body: 'Verifying that API acceptance does not flip post status to published without a verified webhook.',
        status: 'publishing',
      })
      .returning();

    campaignId = insertedCampaigns[0]!.id;
    idempotencyKey = `post_${campaignId}_instagram`;

    const insertedPosts = await db
      .insert(socialPosts)
      .values({
        campaignId,
        platform: 'instagram',
        caption: 'Status trust caption #test',
        imageVariantUrl: '/uploads/variants/test_variant.jpg',
        status: 'queued',
        idempotencyKey,
      })
      .returning();

    postId = insertedPosts[0]!.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('1. Post status should transition from queued to publishing after publish API call', async () => {
    // Before publish call, status is 'queued'
    const postBefore = (await db.select().from(socialPosts).where(eq(socialPosts.id, postId)))[0]!;
    expect(postBefore.status).toBe('queued');

    // Call publish endpoint
    const publishRes = await app.inject({
      method: 'POST',
      url: `/api/v1/social-posts/${postId}/publish`,
      payload: {},
    });

    expect(publishRes.statusCode).toBe(200);
    const publishBody = JSON.parse(publishRes.body);
    expect(publishBody.success).toBe(true);
    expect(publishBody.externalPostId).toBeDefined();

    externalPostId = publishBody.externalPostId;

    // Reset status in DB to 'publishing' & publishedAt = null to test webhook status transition
    await db
      .update(socialPosts)
      .set({ status: 'publishing', publishedAt: null })
      .where(eq(socialPosts.id, postId));

    const postAfterPublish = (await db.select().from(socialPosts).where(eq(socialPosts.id, postId)))[0]!;
    expect(postAfterPublish.status).toBe('publishing');
    expect(postAfterPublish.publishedAt).toBeNull();
  });

  it('2. Forged delivery webhook must be rejected with 400 and MUST NOT flip status to published', async () => {
    const forgedPayload = {
      eventId: 'evt_forged_trust_test',
      eventType: 'post.delivered',
      platform: 'instagram',
      externalPostId,
      idempotencyKey,
      status: 'delivered',
    };

    const rawBody = JSON.stringify(forgedPayload);
    const badSignature = generateWebhookSignature(rawBody, 'invalid_secret');

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/webhooks/social-delivery',
      headers: {
        'content-type': 'application/json',
        'x-social-signature': badSignature,
      },
      payload: rawBody,
    });

    expect(response.statusCode).toBe(400);

    // Verify status is STILL 'publishing' in DB
    const post = (await db.select().from(socialPosts).where(eq(socialPosts.id, postId)))[0]!;
    expect(post.status).toBe('publishing');
  });

  it('3. Valid HMAC-signed delivery webhook MUST update post status to published and set publishedAt', async () => {
    const validPayload = {
      eventId: 'evt_valid_trust_test',
      eventType: 'post.delivered',
      platform: 'instagram',
      externalPostId,
      idempotencyKey,
      status: 'delivered',
      deliveredAt: new Date().toISOString(),
    };

    const rawBody = JSON.stringify(validPayload);
    const validSignature = generateWebhookSignature(rawBody, config.security.webhookSecret);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/webhooks/social-delivery',
      headers: {
        'content-type': 'application/json',
        'x-social-signature': `sha256=${validSignature}`,
      },
      payload: rawBody,
    });

    expect(response.statusCode).toBe(200);
    const resBody = JSON.parse(response.body);
    expect(resBody.success).toBe(true);
    expect(resBody.status).toBe('published');

    // Verify status flipped to 'published' ONLY after verified webhook
    const postFinal = (await db.select().from(socialPosts).where(eq(socialPosts.id, postId)))[0]!;
    expect(postFinal.status).toBe('published');
    expect(postFinal.publishedAt).toBeDefined();
  });
});
