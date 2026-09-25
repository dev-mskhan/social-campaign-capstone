import { PlatformId } from '../../domain/platforms/specifications';
import {
  SocialPublisher,
  PublishInput,
  PublishResult,
  PublishError,
} from '../../domain/publishing/social-publisher.interface';
import { fakeSocialPlatformServer, FakePublishResponse } from '../fake-platform/fake-server';
import { logger } from '../logger';

export class FakeInstagramPublisher implements SocialPublisher {
  getPlatformId(): PlatformId {
    return 'instagram';
  }

  async publish(input: PublishInput): Promise<PublishResult> {
    logger.info({ postId: input.postId, idempotencyKey: input.idempotencyKey }, 'FakeInstagramPublisher executing publish');

    const token = input.accessToken || 'fake_oauth_token_instagram_default';

    // Simulate rate limit if requested in metadata/options
    const simulateRateLimitOnce = (input as any).simulateRateLimitOnce === true;

    const response = await fakeSocialPlatformServer.handlePublishRequest(
      'instagram',
      token,
      {
        idempotencyKey: input.idempotencyKey,
        caption: input.caption,
        imageUrl: input.imageUrl,
      },
      { simulateRateLimitOnce }
    );

    if (response.status === 429) {
      const retryAfter = (response.body as any).retryAfterSeconds || 2;
      const error: PublishError = new Error('Rate limit 429 encountered on Instagram publishing') as PublishError;
      error.code = 'RATE_LIMITED';
      error.isRetryable = true;
      error.retryAfterSeconds = retryAfter;
      error.statusCode = 429;
      throw error;
    }

    if (response.status !== 200 && response.status !== 201) {
      const error: PublishError = new Error(`Fake Instagram server error: ${response.status}`) as PublishError;
      error.code = response.status === 401 ? 'UNAUTHORIZED' : 'SERVER_ERROR';
      error.isRetryable = response.status >= 500;
      error.statusCode = response.status;
      throw error;
    }

    const data = response.body as FakePublishResponse;

    return {
      success: true,
      platform: 'instagram',
      externalPostId: data.id,
      publishedAt: new Date(data.publishedAt),
      metadata: {
        fakeServerStatus: response.status,
        idempotencyKey: data.idempotencyKey,
      },
    };
  }
}

export const fakeInstagramPublisher = new FakeInstagramPublisher();
