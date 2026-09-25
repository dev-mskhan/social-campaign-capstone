import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app/app';

describe('Publishing API Endpoint Integration Tests', () => {
  let app: FastifyInstance;
  let campaignId: string;
  let postId: string;

  beforeAll(async () => {
    app = buildApp({ logger: false });
    await app.ready();

    // 1. Create a campaign with draft posts
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/campaigns',
      payload: {
        title: 'Phase 3 Publishing System Test',
        body: 'Testing end to end social post publishing via fake adapters.',
        platforms: ['instagram', 'x'],
      },
    });

    expect(createRes.statusCode).toBe(201);
    const body = JSON.parse(createRes.body);
    campaignId = body.id;
    postId = body.posts[0].id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/v1/social-posts/:id/publish should publish social post successfully', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/social-posts/${postId}/publish`,
      payload: {},
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);

    expect(body.success).toBe(true);
    expect(body.externalPostId).toBeDefined();

    // Verify DB status updated to 'published'
    const getRes = await app.inject({
      method: 'GET',
      url: `/api/v1/campaigns/${campaignId}`,
    });

    expect(getRes.statusCode).toBe(200);
    const campaignBody = JSON.parse(getRes.body);
    const publishedPost = campaignBody.posts.find((p: any) => p.id === postId);

    expect(publishedPost.status).toBe('published');
    expect(publishedPost.externalPostId).toBe(body.externalPostId);
  });

  it('POST /api/v1/social-posts/:id/publish should handle rate limit retry safely', async () => {
    // Get second post (X post)
    const getRes = await app.inject({
      method: 'GET',
      url: `/api/v1/campaigns/${campaignId}/posts`,
    });
    const posts = JSON.parse(getRes.body);
    const xPost = posts.find((p: any) => p.platform === 'x');

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/social-posts/${xPost.id}/publish`,
      payload: {
        simulateRateLimitOnce: true,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.externalPostId).toBeDefined();
  });

  it('POST /api/v1/social-posts/:id/publish should return 404 for non-existent post', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/social-posts/00000000-0000-0000-0000-000000000000/publish',
    });

    expect(response.statusCode).toBe(404);
  });
});
