import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app/app';
import { db } from '../src/db/client';
import { campaigns, socialPosts } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { generateWebhookSignature } from '../src/infrastructure/security/webhook-signature';
import { config } from '../src/config/config';

describe('Signed Delivery Webhook API Integration Tests', () => {
  let app: FastifyInstance;
  let campaignId: string;
  let postId: string;
  const externalPostId = `fake_instagram_post_webhook_${Date.now()}`;
  const secret = config.security.webhookSecret;

  beforeAll(async () => {
    app = buildApp({ logger: false });
    await app.ready();

    // 1. Create a campaign and post in DB with status = 'publishing'
    const insertedCampaigns = await db
      .insert(campaigns)
      .values({
        title: 'Webhook API Verification Campaign',
        body: 'Testing HMAC signed webhooks.',
        status: 'publishing',
      })
      .returning();

    campaignId = insertedCampaigns[0]!.id;

    const insertedPosts = await db
      .insert(socialPosts)
      .values({
        campaignId,
        platform: 'instagram',
        caption: 'Testing webhooks #test',
        imageVariantUrl: '/uploads/variants/test.jpg',
        status: 'publishing',
        idempotencyKey: `post_${campaignId}_instagram`,
        externalPostId,
      })
      .returning();

    postId = insertedPosts[0]!.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('Test 1 — Valid signature: should accept valid signature and update post status to published', async () => {
    const payload = {
      eventId: 'evt_valid_123',
      eventType: 'post.delivered',
      platform: 'instagram',
      externalPostId,
      status: 'delivered',
      deliveredAt: new Date().toISOString(),
    };

    const rawBody = JSON.stringify(payload);
    const signature = generateWebhookSignature(rawBody, secret);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/webhooks/social-delivery',
      headers: {
        'content-type': 'application/json',
        'x-social-signature': `sha256=${signature}`,
      },
      payload: rawBody,
    });

    expect(response.statusCode).toBe(200);
    const resBody = JSON.parse(response.body);
    expect(resBody.success).toBe(true);
    expect(resBody.status).toBe('published');

    // Verify DB updated
    const posts = await db.select().from(socialPosts).where(eq(socialPosts.id, postId));
    expect(posts[0]!.status).toBe('published');
    expect(posts[0]!.publishedAt).toBeDefined();
  });

  it('Test 2 — Missing signature: should return 400 Bad Request when signature header is missing', async () => {
    const payload = {
      eventId: 'evt_missing_sig',
      eventType: 'post.delivered',
      platform: 'instagram',
      externalPostId,
      status: 'delivered',
    };

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/webhooks/social-delivery',
      headers: {
        'content-type': 'application/json',
      },
      payload,
    });

    expect(response.statusCode).toBe(400);
    const resBody = JSON.parse(response.body);
    expect(resBody.error.code).toBe('INVALID_SIGNATURE');
  });

  it('Test 3 — Forged signature: should return 400 Bad Request when signature is generated with wrong secret', async () => {
    const payload = {
      eventId: 'evt_forged',
      eventType: 'post.delivered',
      platform: 'instagram',
      externalPostId,
      status: 'delivered',
    };

    const rawBody = JSON.stringify(payload);
    const forgedSignature = generateWebhookSignature(rawBody, 'wrong_forged_secret_key');

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/webhooks/social-delivery',
      headers: {
        'content-type': 'application/json',
        'x-social-signature': forgedSignature,
      },
      payload: rawBody,
    });

    expect(response.statusCode).toBe(400);
    const resBody = JSON.parse(response.body);
    expect(resBody.error.code).toBe('INVALID_SIGNATURE');
  });

  it('Test 4 — Modified payload: should return 400 Bad Request when payload is modified after signing', async () => {
    const originalPayload = {
      eventId: 'evt_original',
      eventType: 'post.delivered',
      platform: 'instagram',
      externalPostId,
      status: 'delivered',
    };

    const originalRawBody = JSON.stringify(originalPayload);
    const validSignature = generateWebhookSignature(originalRawBody, secret);

    const tamperedPayload = {
      ...originalPayload,
      status: 'FORGED_STATUS',
    };

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/webhooks/social-delivery',
      headers: {
        'content-type': 'application/json',
        'x-social-signature': validSignature,
      },
      payload: JSON.stringify(tamperedPayload),
    });

    expect(response.statusCode).toBe(400);
  });

  it('Test 5 — Duplicate valid webhook: should handle repeated delivery events safely without corruption', async () => {
    const payload = {
      eventId: 'evt_duplicate_test',
      eventType: 'post.delivered',
      platform: 'instagram',
      externalPostId,
      status: 'delivered',
    };

    const rawBody = JSON.stringify(payload);
    const signature = generateWebhookSignature(rawBody, secret);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/webhooks/social-delivery',
      headers: {
        'content-type': 'application/json',
        'x-social-signature': signature,
      },
      payload: rawBody,
    });

    expect(response.statusCode).toBe(200);
    const resBody = JSON.parse(response.body);
    expect(resBody.success).toBe(true);
    expect(resBody.status).toBe('published');

    const posts = await db.select().from(socialPosts).where(eq(socialPosts.id, postId));
    expect(posts[0]!.status).toBe('published');
  });

  it('Test 6 — Invalid payload: should return 400 Bad Request when externalPostId is missing', async () => {
    const payload = {
      eventId: 'evt_no_id',
      eventType: 'post.delivered',
      platform: 'instagram',
      // externalPostId missing
      status: 'delivered',
    };

    const rawBody = JSON.stringify(payload);
    const signature = generateWebhookSignature(rawBody, secret);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/webhooks/social-delivery',
      headers: {
        'content-type': 'application/json',
        'x-social-signature': signature,
      },
      payload: rawBody,
    });

    expect(response.statusCode).toBe(400);
  });
});
