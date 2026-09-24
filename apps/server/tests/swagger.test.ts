import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app/app';

describe('Swagger / OpenAPI Documentation Endpoint Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = buildApp({ logger: false });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /docs should serve or redirect to Swagger UI', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/docs/',
    });

    expect([200, 301, 302]).toContain(response.statusCode);
  });

  it('GET /docs/json should return OpenAPI schema JSON specification', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/docs/json',
    });

    expect(response.statusCode).toBe(200);
    const spec = JSON.parse(response.body);
    expect(spec).toHaveProperty('openapi');
    expect(spec.info.title).toBe('Multi-Platform Social Campaign Publisher API');
    expect(spec.paths).toHaveProperty('/api/v1/health');
  });
});
