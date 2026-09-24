import { PlatformId } from '../platforms/specifications';

export interface PublishInput {
  /** Durable idempotency key protecting against duplicate external posts */
  idempotencyKey: string;
  /** Domain identifier of the social post */
  postId: string;
  /** Parent campaign identifier */
  campaignId: string;
  /** Target social platform */
  platform: PlatformId;
  /** Formatted platform-specific caption */
  caption: string;
  /** URL or path to the processed platform-specific image variant */
  imageUrl: string;
  /** Credentials token payload for the fake platform adapter */
  accessToken?: string;
  /** Target publication schedule timestamp */
  scheduledAt?: Date;
}

export interface PublishResult {
  /** Indicates whether the publishing request was accepted/successful */
  success: boolean;
  /** Platform identifier returned by publisher */
  platform: PlatformId;
  /** External post ID assigned by the fake platform server */
  externalPostId: string;
  /** Exact ISO timestamp of publication */
  publishedAt: Date;
  /** Optional platform-specific metadata (e.g., post URL, raw response) */
  metadata?: Record<string, unknown>;
}

export type PublishErrorCode =
  | 'RATE_LIMITED'
  | 'UNAUTHORIZED'
  | 'INVALID_INPUT'
  | 'NETWORK_ERROR'
  | 'SERVER_ERROR'
  | 'DUPLICATE_REQUEST'
  | 'UNKNOWN';

export interface PublishError extends Error {
  code: PublishErrorCode;
  isRetryable: boolean;
  retryAfterSeconds?: number;
  statusCode?: number;
  details?: Record<string, unknown>;
}

/**
 * Standard, platform-agnostic interface for social platform publishing adapters.
 * All concrete platform adapters (e.g. FakeInstagramPublisher, FakeXPublisher) must implement this interface.
 */
export interface SocialPublisher {
  /**
   * Returns the target platform identifier handled by this publisher.
   */
  getPlatformId(): PlatformId;

  /**
   * Publishes content to the platform idempotently.
   *
   * @param input Generic publish input containing idempotency key, content, and image variant.
   * @returns Resolves with PublishResult on success, or throws PublishError on failure.
   */
  publish(input: PublishInput): Promise<PublishResult>;
}
