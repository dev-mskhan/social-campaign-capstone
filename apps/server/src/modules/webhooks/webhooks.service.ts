import { eq } from 'drizzle-orm';
import { db } from '../../db/client';
import { socialPosts, campaigns } from '../../db/schema';
import { verifyWebhookSignature } from '../../infrastructure/security/webhook-signature';
import { assertValidStatusTransition } from '../../domain/campaigns/status';
import { logger } from '../../infrastructure/logger';
import { AppError } from '../../shared/errors/app-error';

export interface DeliveryWebhookPayload {
  eventId: string;
  eventType: string;
  platform: string;
  externalPostId: string;
  idempotencyKey?: string;
  status: string;
  deliveredAt?: string;
}

export class WebhooksService {
  /**
   * Processes a signed delivery webhook event from the fake social platform.
   * Verifies HMAC signature before trusting or mutating any database status.
   */
  async processDeliveryWebhook(
    rawBody: string | Buffer,
    signatureHeader: string | undefined | null,
    payload: DeliveryWebhookPayload
  ): Promise<{ success: boolean; postId: string; status: string }> {
    // 1. Signature Verification (HMAC-SHA256 constant-time check)
    const isValid = verifyWebhookSignature(rawBody, signatureHeader);
    if (!isValid) {
      logger.warn(
        { signatureHeader: signatureHeader ? 'provided' : 'missing' },
        'Rejected delivery webhook due to invalid HMAC signature'
      );
      throw new AppError('Invalid or forged webhook signature', 400, 'INVALID_SIGNATURE');
    }

    // 2. Payload Validation
    if (!payload || !payload.externalPostId) {
      throw new AppError('Invalid webhook payload: missing externalPostId', 400, 'INVALID_PAYLOAD');
    }

    // 3. Find Social Post by externalPostId or idempotencyKey
    const posts = await db
      .select()
      .from(socialPosts)
      .where(eq(socialPosts.externalPostId, payload.externalPostId));

    let post = posts[0];

    if (!post && payload.idempotencyKey) {
      const postsByKey = await db
        .select()
        .from(socialPosts)
        .where(eq(socialPosts.idempotencyKey, payload.idempotencyKey));
      post = postsByKey[0];
    }

    if (!post) {
      logger.warn(
        { externalPostId: payload.externalPostId, idempotencyKey: payload.idempotencyKey },
        'Delivery webhook target social post not found'
      );
      throw new AppError(`Social post with external ID '${payload.externalPostId}' not found`, 404, 'POST_NOT_FOUND');
    }

    // 4. Webhook Idempotency Check: if post is already published, return success without mutating
    if (post.status === 'published') {
      logger.info(
        { postId: post.id, externalPostId: post.externalPostId },
        'Duplicate delivery webhook received — post is already published'
      );
      return { success: true, postId: post.id, status: 'published' };
    }

    // 5. Assert & Execute Status State Machine Transition: publishing -> published
    assertValidStatusTransition(post.status as any, 'published');

    const publishedAt = payload.deliveredAt ? new Date(payload.deliveredAt) : new Date();

    await db
      .update(socialPosts)
      .set({
        status: 'published',
        publishedAt,
        updatedAt: new Date(),
      })
      .where(eq(socialPosts.id, post.id));

    logger.info(
      { postId: post.id, externalPostId: post.externalPostId, campaignId: post.campaignId },
      'Verified delivery webhook processed — social post status updated to published'
    );

    // 6. Check Campaign Status: if all posts for this campaign are published, mark campaign completed
    const campaignPosts = await db
      .select()
      .from(socialPosts)
      .where(eq(socialPosts.campaignId, post.campaignId));

    const allPublished = campaignPosts.every((p) => p.status === 'published');
    if (allPublished && campaignPosts.length > 0) {
      await db
        .update(campaigns)
        .set({ status: 'completed', updatedAt: new Date() })
        .where(eq(campaigns.id, post.campaignId));

      logger.info({ campaignId: post.campaignId }, 'All social posts published — campaign marked completed');
    }

    return { success: true, postId: post.id, status: 'published' };
  }
}

export const webhooksService = new WebhooksService();
