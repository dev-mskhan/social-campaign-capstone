import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import {
  createCampaignHandler,
  getCampaignHandler,
  getCampaignPostsHandler,
} from '../../modules/campaigns/campaigns.controller';

const socialPostSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    campaignId: { type: 'string' },
    platform: { type: 'string', enum: ['instagram', 'x'] },
    caption: { type: 'string' },
    imageVariantUrl: { type: 'string' },
    status: { type: 'string', enum: ['queued', 'publishing', 'published', 'failed'] },
    idempotencyKey: { type: 'string' },
    externalPostId: { type: 'string', nullable: true },
    scheduledAt: { type: 'string', nullable: true },
    publishedAt: { type: 'string', nullable: true },
    lastError: { type: 'string', nullable: true },
    createdAt: { type: 'string' },
    updatedAt: { type: 'string' },
  },
};

const campaignResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    title: { type: 'string' },
    body: { type: 'string' },
    sourceUrl: { type: 'string', nullable: true },
    sourceImageUrl: { type: 'string', nullable: true },
    status: { type: 'string' },
    scheduledAt: { type: 'string', nullable: true },
    createdAt: { type: 'string' },
    updatedAt: { type: 'string' },
    posts: {
      type: 'array',
      items: socialPostSchema,
    },
  },
};

const errorResponseSchema = {
  type: 'object',
  properties: {
    error: {
      type: 'object',
      properties: {
        code: { type: 'string' },
        message: { type: 'string' },
        requestId: { type: 'string' },
        details: { type: 'object', additionalProperties: true },
      },
    },
  },
};

export const campaignsRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // POST /api/v1/campaigns
  fastify.post(
    '/campaigns',
    {
      schema: {
        summary: 'Create a social campaign and generate platform post drafts',
        description: 'Creates a campaign and executes image variant processing and platform-tailored caption composition for Instagram and X.',
        tags: ['Campaigns'],
        body: {
          type: 'object',
          required: ['title', 'body', 'platforms'],
          properties: {
            title: { type: 'string', minLength: 1 },
            body: { type: 'string', minLength: 1 },
            sourceUrl: { type: 'string' },
            sourceImageUrl: { type: 'string' },
            platforms: {
              type: 'array',
              items: { type: 'string', enum: ['instagram', 'x'] },
              minItems: 1,
            },
            scheduledAt: { type: 'string' },
          },
        },
        response: {
          201: campaignResponseSchema,
          400: errorResponseSchema,
        },
      },
    },
    createCampaignHandler
  );

  // GET /api/v1/campaigns/:id
  fastify.get(
    '/campaigns/:id',
    {
      schema: {
        summary: 'Get campaign details with social posts',
        description: 'Retrieves a single campaign by ID along with its platform social posts and statuses.',
        tags: ['Campaigns'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
        response: {
          200: campaignResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    getCampaignHandler
  );

  // GET /api/v1/campaigns/:id/posts
  fastify.get(
    '/campaigns/:id/posts',
    {
      schema: {
        summary: 'Get social posts for a campaign',
        description: 'Retrieves all platform-specific social posts generated for a campaign.',
        tags: ['Campaigns'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'array',
            items: socialPostSchema,
          },
          404: errorResponseSchema,
        },
      },
    },
    getCampaignPostsHandler
  );
};
