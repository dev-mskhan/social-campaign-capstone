import { eq } from 'drizzle-orm';
import { db } from '../../db/client';
import { campaigns, socialPosts, SocialPostRecord } from '../../db/schema';
import { CreateCampaignRequest, CampaignResponse, SocialPostResponse } from '../../domain/api/contracts';
import { PlatformId } from '../../domain/platforms/specifications';
import { imagePipelineService } from '../content/image-pipeline.service';
import { captionComposerService } from '../content/caption-composer.service';
import { logger } from '../../infrastructure/logger';
import { AppError } from '../../shared/errors/app-error';

export class CampaignsService {
  /**
   * Creates a new campaign and generates platform-specific social post drafts (image variants + captions).
   */
  async createCampaign(input: CreateCampaignRequest): Promise<CampaignResponse> {
    if (!input.title || input.title.trim() === '') {
      throw new AppError('Campaign title is required', 400, 'INVALID_INPUT');
    }
    if (!input.body || input.body.trim() === '') {
      throw new AppError('Campaign body is required', 400, 'INVALID_INPUT');
    }
    if (!input.platforms || !Array.isArray(input.platforms) || input.platforms.length === 0) {
      throw new AppError('At least one platform must be specified', 400, 'INVALID_INPUT');
    }

    const scheduledAtDate = input.scheduledAt ? new Date(input.scheduledAt) : null;

    // 1. Insert Campaign Record
    const insertedCampaigns = await db
      .insert(campaigns)
      .values({
        title: input.title,
        body: input.body,
        sourceUrl: input.sourceUrl || null,
        sourceImageUrl: input.sourceImageUrl || null,
        status: scheduledAtDate ? 'scheduled' : 'publishing',
        scheduledAt: scheduledAtDate,
      })
      .returning();

    const campaignRecord = insertedCampaigns[0];
    if (!campaignRecord) {
      throw new AppError('Failed to persist campaign record', 500, 'DATABASE_ERROR');
    }

    logger.info({ campaignId: campaignRecord.id, title: campaignRecord.title }, 'Created campaign record');

    const createdPosts: SocialPostRecord[] = [];

    // 2. Generate Image Variants & Captions for each platform
    for (const platform of input.platforms as PlatformId[]) {
      const sourceImage = input.sourceImageUrl || campaignRecord.title;
      
      // Image variant processing via Sharp
      const imageResult = await imagePipelineService.generateVariant(
        sourceImage,
        platform,
        campaignRecord.id
      );

      // Caption composition via domain spec rules
      const caption = captionComposerService.composeCaption({
        sharedVoice: {
          tone: 'Professional & Engaging',
          targetAudience: 'Tech & Marketing Professionals',
          coreMessage: input.title,
        },
        content: {
          title: input.title,
          summary: input.body.substring(0, 300),
          url: input.sourceUrl || 'https://example.com/blog/campaign',
        },
        platform,
      });

      // Durable idempotency key
      const idempotencyKey = `post_${campaignRecord.id}_${platform}`;

      // Insert Social Post Record
      const insertedPosts = await db
        .insert(socialPosts)
        .values({
          campaignId: campaignRecord.id,
          platform,
          caption,
          imageVariantUrl: imageResult.variantUrl,
          status: 'queued',
          idempotencyKey,
          scheduledAt: scheduledAtDate,
        })
        .returning();

      const postRecord = insertedPosts[0];
      if (postRecord) {
        createdPosts.push(postRecord);
        logger.info(
          { postId: postRecord.id, campaignId: campaignRecord.id, platform, idempotencyKey },
          'Created platform social post entry'
        );
      }
    }

    return this.mapToCampaignResponse(campaignRecord, createdPosts);
  }

  /**
   * Retrieves a campaign by ID including its associated social posts.
   */
  async getCampaignById(campaignId: string): Promise<CampaignResponse> {
    const campaignRecords = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, campaignId));

    const campaignRecord = campaignRecords[0];

    if (!campaignRecord) {
      throw new AppError(`Campaign with ID '${campaignId}' not found`, 404, 'CAMPAIGN_NOT_FOUND');
    }

    const posts = await db
      .select()
      .from(socialPosts)
      .where(eq(socialPosts.campaignId, campaignId));

    return this.mapToCampaignResponse(campaignRecord, posts);
  }

  /**
   * Retrieves all social posts associated with a campaign.
   */
  async getCampaignPosts(campaignId: string): Promise<SocialPostResponse[]> {
    const campaignRecords = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, campaignId));

    if (!campaignRecords[0]) {
      throw new AppError(`Campaign with ID '${campaignId}' not found`, 404, 'CAMPAIGN_NOT_FOUND');
    }

    const posts = await db
      .select()
      .from(socialPosts)
      .where(eq(socialPosts.campaignId, campaignId));

    return posts.map(this.mapToSocialPostResponse);
  }

  private mapToCampaignResponse(campaignRecord: typeof campaigns.$inferSelect, posts: SocialPostRecord[]): CampaignResponse {
    return {
      id: campaignRecord.id,
      title: campaignRecord.title,
      body: campaignRecord.body,
      sourceUrl: campaignRecord.sourceUrl,
      sourceImageUrl: campaignRecord.sourceImageUrl,
      status: campaignRecord.status,
      scheduledAt: campaignRecord.scheduledAt ? campaignRecord.scheduledAt.toISOString() : null,
      createdAt: campaignRecord.createdAt.toISOString(),
      updatedAt: campaignRecord.updatedAt.toISOString(),
      posts: posts.map(this.mapToSocialPostResponse),
    };
  }

  private mapToSocialPostResponse(post: SocialPostRecord): SocialPostResponse {
    return {
      id: post.id,
      campaignId: post.campaignId,
      platform: post.platform as PlatformId,
      caption: post.caption,
      imageVariantUrl: post.imageVariantUrl,
      status: post.status as any,
      idempotencyKey: post.idempotencyKey,
      externalPostId: post.externalPostId,
      scheduledAt: post.scheduledAt ? post.scheduledAt.toISOString() : null,
      publishedAt: post.publishedAt ? post.publishedAt.toISOString() : null,
      lastError: post.lastError,
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
    };
  }
}

export const campaignsService = new CampaignsService();
