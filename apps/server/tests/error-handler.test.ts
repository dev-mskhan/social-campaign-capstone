import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app/app';
import { BadRequestError } from '../src/shared/errors/app-error';

describe('Centralized Error Handling & Request ID Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = buildApp({ logger: false });

    // Register a test route that throws an AppError
    app.get('/test-error', async () => {
      throw new BadRequestError('Custom test error message', { field: 'testField' });
    });

    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should format custom AppError responses with code, message, and requestId', async () => {
    const customRequestId = 'test-request-id-12345';
    const response = await app.inject({
      method: 'GET',
      url: '/test-error',
      headers: {
        'x-request-id': customRequestId,
      },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body).toHaveProperty('error');
    expect(body.error.code).toBe('BAD_REQUEST');
    expect(body.error.message).toBe('Custom test error message');
    expect(body.error.requestId).toBe(customRequestId);
    expect(body.error.details).toEqual({ field: 'testField' });
  });

  it('should format 404 Not Found error into structured format', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/non-existent-route-xyz',
    });

    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.body);
    expect(body).toHaveProperty('error');
    expect(body.error.code).toBe('NOT_FOUND');
    expect(body.error).toHaveProperty('message');
    expect(body.error).toHaveProperty('requestId');
  });
});
