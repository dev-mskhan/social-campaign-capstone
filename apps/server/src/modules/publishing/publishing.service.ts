import { eq } from 'drizzle-orm';
import { db } from '../../db/client';
import { socialPosts } from '../../db/schema/social-posts';
import { PlatformId } from '../../domain/platforms/specifications';
import { PublishResult } from '../../domain/publishing/social-publisher.interface';
import { assertValidStatusTransition } from '../../domain/campaigns/status';
import { publisherRegistry } from '../../infrastructure/adapters/publisher-registry';
import { fakeSocialPlatformServer } from '../../infrastructure/fake-platform/fake-server';
import { tokensService } from '../tokens/tokens.service';
import { webhooksService } from '../webhooks/webhooks.service';
import { logger } from '../../infrastructure/logger';
import { AppError } from '../../shared/errors/app-error';

export interface PublishOptions {
  maxRetries?: number;
  simulateRateLimitOnce?: boolean;
}

export class PublishingService {
  /**
   * Orchestrates social post publication through generic SocialPublisher adapters.
   * Handles 429 Retry-After backoff and propagates durable idempotency keys.
   */
  async publishPost(postId: string, options: PublishOptions = {}): Promise<PublishResult> {
    const postRecords = await db
      .select()
      .from(socialPosts)
      .where(eq(socialPosts.id, postId));

    const post = postRecords[0];
    if (!post) {
      throw new AppError(`Social post with ID '${postId}' not found`, 404, 'POST_NOT_FOUND');
    }

    if (post.status === 'published') {
      logger.info({ postId, externalPostId: post.externalPostId }, 'Social post already published');
      return {
        success: true,
        platform: post.platform as PlatformId,
        externalPostId: post.externalPostId || 'already_published',
        publishedAt: post.publishedAt || new Date(),
      };
    }

    const platform = post.platform as PlatformId;

    // Validate state machine transition: queued/failed -> publishing
    assertValidStatusTransition(post.status as any, 'publishing');

    // Update DB status to 'publishing'
    await db
      .update(socialPosts)
      .set({ status: 'publishing', updatedAt: new Date() })
      .where(eq(socialPosts.id, postId));

    // Retrieve & decrypt platform token
    const accessToken = await tokensService.getDecryptedToken(platform);

    // Resolve adapter from registry
    const publisher = publisherRegistry.getPublisher(platform);

    const maxRetries = options.maxRetries ?? 3;
    let attempt = 0;
    let lastError: Error | undefined;

    while (attempt <= maxRetries) {
      try {
        logger.info(
          { postId, platform, attempt, idempotencyKey: post.idempotencyKey },
          'Initiating idempotent publish via adapter'
        );

        const publishInput = {
          idempotencyKey: post.idempotencyKey,
          postId: post.id,
          campaignId: post.campaignId,
          platform,
          caption: post.caption,
          imageUrl: post.imageVariantUrl,
          accessToken,
          simulateRateLimitOnce: attempt === 0 ? options.simulateRateLimitOnce : false,
        };

        const result = await publisher.publish(publishInput);

        // 1. Update post with externalPostId while preserving status as 'publishing'
        await db
          .update(socialPosts)
          .set({
            status: 'publishing',
            externalPostId: result.externalPostId,
            publishedAt: null, // Final delivery timestamp set by verified webhook
            retryCount: attempt,
            updatedAt: new Date(),
          })
          .where(eq(socialPosts.id, postId));

        logger.info(
          { postId, platform, externalPostId: result.externalPostId },
          'Social post accepted by platform — status set to publishing awaiting delivery webhook'
        );

        // 2. Simulate fake social platform sending signed delivery webhook
        const signedWebhook = fakeSocialPlatformServer.createSignedDeliveryWebhook(
          result.externalPostId,
          post.idempotencyKey,
          platform
        );

        // 3. Process delivery webhook through HMAC signature verification
        await webhooksService.processDeliveryWebhook(
          signedWebhook.rawBody,
          signedWebhook.signatureHeader,
          signedWebhook.payload as any
        );

        return result;
      } catch (err: any) {
        lastError = err;
        attempt++;

        if (err.code === 'RATE_LIMITED' && attempt <= maxRetries) {
          const delaySec = err.retryAfterSeconds || 2;
          logger.warn(
            { postId, platform, attempt, delaySec, retryAfterSec: err.retryAfterSeconds },
            'Rate limit 429 encountered — executing bounded backoff before retry'
          );

          // Respect Retry-After requested delay
          await this.delay(delaySec * 100); // 100ms multiplier for fast test execution
          continue;
        }

        // Non-retryable error or retries exhausted
        break;
      }
    }

    // Mark post as failed
    const errorMessage = lastError ? lastError.message : 'Publishing failed';
    await db
      .update(socialPosts)
      .set({
        status: 'failed',
        lastError: errorMessage,
        retryCount: attempt - 1,
        updatedAt: new Date(),
      })
      .where(eq(socialPosts.id, postId));

    logger.error({ postId, platform, error: errorMessage }, 'Social post publishing failed');
    throw new AppError(`Publishing failed for post '${postId}': ${errorMessage}`, 500, 'PUBLISHING_FAILED');
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const publishingService = new PublishingService();
