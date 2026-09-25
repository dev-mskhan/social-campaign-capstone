import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { handleDeliveryWebhook } from '../../modules/webhooks/webhooks.controller';

const deliveryWebhookBodySchema = {
  type: 'object',
  required: ['eventId', 'eventType', 'platform', 'externalPostId', 'status'],
  properties: {
    eventId: { type: 'string' },
    eventType: { type: 'string' },
    platform: { type: 'string', enum: ['instagram', 'x'] },
    externalPostId: { type: 'string' },
    idempotencyKey: { type: 'string' },
    status: { type: 'string' },
    deliveredAt: { type: 'string' },
  },
};

const webhookSuccessResponseSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    postId: { type: 'string' },
    status: { type: 'string' },
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

export const webhookRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // POST /api/v1/webhooks/social-delivery
  fastify.post(
    '/webhooks/social-delivery',
    {
      schema: {
        summary: 'Receive signed social delivery webhook',
        description:
          'Receives delivery confirmation event from fake social platform. Verifies HMAC-SHA256 signature before updating social post status from publishing to published.',
        tags: ['Webhooks'],
        body: deliveryWebhookBodySchema,
        response: {
          200: webhookSuccessResponseSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
          500: errorResponseSchema,
        },
      },
    },
    handleDeliveryWebhook
  );
};
