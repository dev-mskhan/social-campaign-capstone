import { describe, it, expect, beforeEach } from 'vitest';
import { FakeInstagramPublisher } from '../src/infrastructure/adapters/fake-instagram-publisher';
import { fakeSocialPlatformServer } from '../src/infrastructure/fake-platform/fake-server';

describe('Idempotent Publishing & Rate Limit 429 Tests', () => {
  const publisher = new FakeInstagramPublisher();

  beforeEach(() => {
    fakeSocialPlatformServer.reset();
  });

  it('should guarantee idempotency when publishing same request twice', async () => {
    const input = {
      idempotencyKey: 'post_unique_idempotency_key_101',
      postId: 'post_101',
      campaignId: 'camp_101',
      platform: 'instagram' as const,
      caption: 'Test Instagram Post',
      imageUrl: '/uploads/variants/camp_101_instagram.jpg',
    };

    const res1 = await publisher.publish(input);
    expect(res1.success).toBe(true);
    expect(res1.externalPostId).toBeDefined();

    // Duplicate call with exact same idempotency key
    const res2 = await publisher.publish(input);
    expect(res2.success).toBe(true);
    expect(res2.externalPostId).toEqual(res1.externalPostId);
  });

  it('should throw PublishError with RATE_LIMITED code and retryAfterSeconds on 429', async () => {
    const input = {
      idempotencyKey: 'post_rate_limit_key_202',
      postId: 'post_202',
      campaignId: 'camp_202',
      platform: 'instagram' as const,
      caption: 'Test Rate Limit Post',
      imageUrl: '/uploads/variants/camp_202_instagram.jpg',
      simulateRateLimitOnce: true,
    };

    try {
      await publisher.publish(input);
      expect.fail('Should have thrown 429 RATE_LIMITED PublishError');
    } catch (err: any) {
      expect(err.code).toBe('RATE_LIMITED');
      expect(err.isRetryable).toBe(true);
      expect(err.retryAfterSeconds).toBe(2);
    }

    // Subsequent retry with same idempotency key succeeds
    const res = await publisher.publish(input);
    expect(res.success).toBe(true);
  });
});
