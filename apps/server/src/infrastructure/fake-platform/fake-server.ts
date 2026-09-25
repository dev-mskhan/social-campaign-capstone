import { logger } from '../logger';
import { generateWebhookSignature } from '../security/webhook-signature';
import { config } from '../../config/config';

export interface FakePublishRequest {
  idempotencyKey: string;
  caption: string;
  imageUrl: string;
}

export interface FakePublishResponse {
  id: string;
  platform: string;
  status: 'published';
  publishedAt: string;
  idempotencyKey: string;
}

/**
 * Embedded Fake Social Platform Server simulator.
 * Simulates OAuth token exchange, idempotent publishing, rate limit 429 responses, and signed delivery webhooks.
 */
export class FakeSocialPlatformServer {
  private idempotencyStore = new Map<string, FakePublishResponse>();
  private rateLimitSimulations = new Map<string, number>(); // track simulated 429 countdowns per key

  /**
   * Simulates POST /oauth/token
   */
  async handleOAuthTokenRequest(platform: 'instagram' | 'x'): Promise<{ access_token: string; token_type: string; expires_in: number }> {
    logger.info({ platform }, 'Fake platform issued OAuth access token');
    return {
      access_token: `fake_oauth_token_${platform}_${Date.now()}`,
      token_type: 'Bearer',
      expires_in: 3600,
    };
  }

  /**
   * Simulates publishing to Fake Instagram or Fake X endpoint.
   */
  async handlePublishRequest(
    platform: 'instagram' | 'x',
    token: string,
    payload: FakePublishRequest,
    options: { simulateRateLimitOnce?: boolean } = {}
  ): Promise<{ status: number; body: FakePublishResponse | { error: string; retryAfterSeconds: number }; headers: Record<string, string> }> {
    if (!token || !token.startsWith('fake_oauth_token_')) {
      return {
        status: 401,
        body: { error: 'Unauthorized: Invalid OAuth access token', retryAfterSeconds: 0 },
        headers: {},
      };
    }

    // Rate limit simulation handling (HTTP 429)
    if (options.simulateRateLimitOnce && !this.rateLimitSimulations.has(payload.idempotencyKey)) {
      this.rateLimitSimulations.set(payload.idempotencyKey, 1);
      logger.warn({ platform, idempotencyKey: payload.idempotencyKey }, 'Fake platform simulated 429 Rate Limit');
      return {
        status: 429,
        body: { error: 'Rate limit exceeded', retryAfterSeconds: 2 },
        headers: { 'Retry-After': '2' },
      };
    }

    // Idempotency check: Return existing published post if key has already been published
    const existing = this.idempotencyStore.get(payload.idempotencyKey);
    if (existing) {
      logger.info({ platform, idempotencyKey: payload.idempotencyKey, externalPostId: existing.id }, 'Fake platform idempotent hit — returning existing post');
      return {
        status: 200,
        body: existing,
        headers: {},
      };
    }

    // Create new external post entry
    const externalPostId = `fake_${platform}_post_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const responsePayload: FakePublishResponse = {
      id: externalPostId,
      platform,
      status: 'published',
      publishedAt: new Date().toISOString(),
      idempotencyKey: payload.idempotencyKey,
    };

    this.idempotencyStore.set(payload.idempotencyKey, responsePayload);

    logger.info({ platform, externalPostId, idempotencyKey: payload.idempotencyKey }, 'Fake platform published new post');

    return {
      status: 201,
      body: responsePayload,
      headers: {},
    };
  }

  /**
   * Generates a signed webhook delivery payload and HMAC SHA-256 signature header for an external post.
   */
  createSignedDeliveryWebhook(
    externalPostId: string,
    idempotencyKey: string,
    platform: 'instagram' | 'x',
    secret: string = config.security.webhookSecret
  ): { payload: Record<string, any>; rawBody: string; signatureHeader: string } {
    const payload = {
      eventId: `evt_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      eventType: 'post.delivered',
      platform,
      externalPostId,
      idempotencyKey,
      status: 'delivered',
      deliveredAt: new Date().toISOString(),
    };

    const rawBody = JSON.stringify(payload);
    const signature = generateWebhookSignature(rawBody, secret);

    return {
      payload,
      rawBody,
      signatureHeader: `sha256=${signature}`,
    };
  }

  /**
   * Resets internal in-memory stores for testing.
   */
  reset(): void {
    this.idempotencyStore.clear();
    this.rateLimitSimulations.clear();
  }
}

export const fakeSocialPlatformServer = new FakeSocialPlatformServer();
