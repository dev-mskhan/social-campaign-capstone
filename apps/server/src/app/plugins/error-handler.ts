import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { config } from '../../config/config';
import { AppError } from '../../shared/errors/app-error';

const errorHandlerPlugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.setNotFoundHandler((request, reply) => {
    const requestId = (request.id as string) || 'unknown';
    return reply.status(404).send({
      error: {
        code: 'NOT_FOUND',
        message: `Route ${request.method} ${request.url} not found`,
        requestId,
      },
    });
  });

  fastify.setErrorHandler((error, request, reply) => {
    const requestId = (request.id as string) || 'unknown';

    // Log the error
    request.log.error({ err: error, requestId }, 'Request encountered an error');

    // 1. Custom AppError
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        error: {
          code: error.code,
          message: error.message,
          requestId,
          ...(error.details ? { details: error.details } : {}),
        },
      });
    }

    // 2. Fastify Validation Error
    if (error.validation) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request payload or parameters',
          requestId,
          details: error.validation,
        },
      });
    }

    // 3. Fastify Standard HTTP Error
    const statusCode = error.statusCode || 500;
    const isClientError = statusCode >= 400 && statusCode < 500;

    const code = isClientError ? 'CLIENT_ERROR' : 'INTERNAL_SERVER_ERROR';
    const message = isClientError || config.isDev ? error.message : 'An unexpected error occurred';

    return reply.status(statusCode).send({
      error: {
        code,
        message,
        requestId,
      },
    });
  });
};

export default fp(errorHandlerPlugin, {
  name: 'error-handler-plugin',
});
