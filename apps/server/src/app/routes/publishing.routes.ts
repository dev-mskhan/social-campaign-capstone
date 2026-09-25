import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { publishPostHandler } from '../../modules/publishing/publishing.controller';

const publishResultSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    platform: { type: 'string', enum: ['instagram', 'x'] },
    externalPostId: { type: 'string' },
    publishedAt: { type: 'string' },
    metadata: { type: 'object', additionalProperties: true },
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

export const publishingRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // POST /api/v1/social-posts/:id/publish
  fastify.post(
    '/social-posts/:id/publish',
    {
      schema: {
        summary: 'Publish a social post to its platform',
        description: 'Publishes a draft social post via SocialPublisher adapters to the fake social platform server with idempotency and rate-limit handling.',
        tags: ['Publishing'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
        response: {
          200: publishResultSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
          500: errorResponseSchema,
        },
      },
    },
    publishPostHandler
  );
};
