import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app/app';

describe('Campaigns & Social Posts API Integration Tests', () => {
  let app: FastifyInstance;
  let createdCampaignId: string;

  beforeAll(async () => {
    app = buildApp({ logger: false });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/v1/campaigns should create campaign and generate social posts', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/campaigns',
      payload: {
        title: 'Phase 2 Content Generation Engine',
        body: 'Testing Sharp image processing and platform tailored caption composition.',
        sourceUrl: 'https://example.com/blog/phase2-engine',
        platforms: ['instagram', 'x'],
      },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);

    expect(body).toHaveProperty('id');
    expect(body.title).toBe('Phase 2 Content Generation Engine');
    expect(body.posts).toHaveLength(2);

    createdCampaignId = body.id;

    const instaPost = body.posts.find((p: any) => p.platform === 'instagram');
    const xPost = body.posts.find((p: any) => p.platform === 'x');

    expect(instaPost).toBeDefined();
    expect(instaPost.status).toBe('queued');
    expect(instaPost.imageVariantUrl).toContain('_instagram_');
    expect(instaPost.idempotencyKey).toBe(`post_${createdCampaignId}_instagram`);

    expect(xPost).toBeDefined();
    expect(xPost.status).toBe('queued');
    expect(xPost.imageVariantUrl).toContain('_x_');
    expect(xPost.idempotencyKey).toBe(`post_${createdCampaignId}_x`);
  });

  it('GET /api/v1/campaigns/:id should return created campaign details', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/campaigns/${createdCampaignId}`,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);

    expect(body.id).toBe(createdCampaignId);
    expect(body.posts).toHaveLength(2);
  });

  it('GET /api/v1/campaigns/:id/posts should return posts array', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/campaigns/${createdCampaignId}/posts`,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);

    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(2);
  });

  it('POST /api/v1/campaigns should return 400 for missing required body fields', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/campaigns',
      payload: {
        title: 'Missing Body and Platforms',
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it('GET /api/v1/campaigns/:id should return 404 for non-existent campaign', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/campaigns/00000000-0000-0000-0000-000000000000',
    });

    expect(response.statusCode).toBe(404);
  });
});
