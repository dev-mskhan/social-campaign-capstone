import { PlatformId } from '../platforms/specifications';
import { SocialPostStatus } from '../campaigns/status';

/**
 * DTO for POST /api/v1/campaigns request payload
 */
export interface CreateCampaignRequest {
  title: string;
  body: string;
  sourceUrl?: string;
  sourceImageUrl?: string;
  platforms: PlatformId[];
  scheduledAt?: string; // ISO 8601 date string
}

/**
 * DTO for individual social post response in API payloads
 */
export interface SocialPostResponse {
  id: string;
  campaignId: string;
  platform: PlatformId;
  caption: string;
  imageVariantUrl: string;
  status: SocialPostStatus;
  idempotencyKey: string;
  externalPostId?: string | null;
  scheduledAt?: string | null;
  publishedAt?: string | null;
  lastError?: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * DTO for GET /api/v1/campaigns/:id response
 */
export interface CampaignResponse {
  id: string;
  title: string;
  body: string;
  sourceUrl?: string | null;
  sourceImageUrl?: string | null;
  status: string;
  scheduledAt?: string | null;
  createdAt: string;
  updatedAt: string;
  posts: SocialPostResponse[];
}

/**
 * Payload for POST /api/v1/webhooks/social-delivery
 */
export interface SocialDeliveryWebhookPayload {
  eventId: string;
  idempotencyKey: string;
  externalPostId: string;
  platform: PlatformId;
  status: 'DELIVERED' | 'FAILED';
  timestamp: string;
  failureReason?: string;
}

export interface WebhookResponse {
  received: boolean;
  message?: string;
}
