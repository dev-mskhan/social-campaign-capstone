import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { getHealthHandler, getReadinessHandler } from '../../modules/health/health.controller';

export const healthRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get(
    '/health',
    {
      schema: {
        description: 'Liveness check endpoint',
        tags: ['Health'],
        response: {
          200: {
            type: 'object',
            required: ['status', 'timestamp'],
            properties: {
              status: { type: 'string', example: 'ok' },
              timestamp: { type: 'string', example: '2026-09-24T18:00:00.000Z' },
            },
          },
        },
      },
    },
    getHealthHandler
  );

  fastify.get(
    '/health/ready',
    {
      schema: {
        description: 'Readiness check endpoint verifying Database and Redis connectivity',
        tags: ['Health'],
        response: {
          200: {
            type: 'object',
            required: ['status', 'timestamp', 'dependencies'],
            properties: {
              status: { type: 'string', example: 'ready' },
              timestamp: { type: 'string', example: '2026-09-24T18:00:00.000Z' },
              dependencies: {
                type: 'object',
                required: ['database', 'redis'],
                properties: {
                  database: { type: 'string', example: 'up' },
                  redis: { type: 'string', example: 'up' },
                },
              },
            },
          },
          503: {
            type: 'object',
            required: ['status', 'timestamp', 'dependencies'],
            properties: {
              status: { type: 'string', example: 'not_ready' },
              timestamp: { type: 'string', example: '2026-09-24T18:00:00.000Z' },
              dependencies: {
                type: 'object',
                required: ['database', 'redis'],
                properties: {
                  database: { type: 'string', example: 'down' },
                  redis: { type: 'string', example: 'down' },
                },
              },
            },
          },
        },
      },
    },
    getReadinessHandler
  );
};
