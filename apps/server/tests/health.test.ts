import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app/app';

describe('Health Endpoints Infrastructure Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = buildApp({ logger: false });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health should return 200 with status ok and timestamp', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe('ok');
    expect(body).toHaveProperty('timestamp');
  });

  it('GET /api/v1/health should return 200 with status ok', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/health',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe('ok');
  });

  it('GET /health/ready should respond with readiness probe structure', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health/ready',
    });

    expect([200, 503]).toContain(response.statusCode);
    const body = JSON.parse(response.body);
    expect(body).toHaveProperty('status');
    expect(body).toHaveProperty('timestamp');
    expect(body).toHaveProperty('dependencies');
    expect(body.dependencies).toHaveProperty('database');
    expect(body.dependencies).toHaveProperty('redis');
  });
});
