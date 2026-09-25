import randomUUID from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import Fastify, { FastifyInstance, FastifyServerOptions } from 'fastify';
import cors from '@fastify/cors';
import { config } from '../config/config';
import { pinoLoggerOptions } from '../infrastructure/logger';
import swaggerPlugin from './plugins/swagger';
import errorHandlerPlugin from './plugins/error-handler';
import { healthRoutes } from './routes/health.routes';
import { campaignsRoutes } from './routes/campaigns.routes';
import { publishingRoutes } from './routes/publishing.routes';
import { webhookRoutes } from './routes/webhook.routes';

export function buildApp(options: FastifyServerOptions = {}): FastifyInstance {
  const app = Fastify({
    logger: pinoLoggerOptions,
    genReqId: (req) => {
      const headerReqId = req.headers['x-request-id'];
      if (typeof headerReqId === 'string' && headerReqId.length > 0) {
        return headerReqId;
      }
      return randomUUID.randomUUID();
    },
    ...options,
  });

  // 1. Register CORS
  app.register(cors, {
    origin: true,
  });

  // 2. Register Error Handler
  app.register(errorHandlerPlugin);

  // 3. Register Swagger documentation
  app.register(swaggerPlugin);

  // Fastify preParsing hook for capturing exact raw request body bytes for webhook HMAC verification
  app.addHook('preParsing', async (request, _reply, payload) => {
    if (request.url.includes('/webhooks')) {
      const chunks: Buffer[] = [];
      for await (const chunk of payload) {
        chunks.push(chunk);
      }
      const rawBuffer = Buffer.concat(chunks);
      (request as any).rawBody = rawBuffer.toString('utf8');
      const { Readable } = await import('node:stream');
      return Readable.from(rawBuffer);
    }
    return payload;
  });

  // 4. Register Routes under API Prefix (e.g., /api/v1)
  app.register(healthRoutes, { prefix: config.server.apiPrefix });
  app.register(campaignsRoutes, { prefix: config.server.apiPrefix });
  app.register(publishingRoutes, { prefix: config.server.apiPrefix });
  app.register(webhookRoutes, { prefix: config.server.apiPrefix });

  // 5. Register root level health check aliases for standard probes
  app.register(healthRoutes);

  // 6. Serve static uploads directory
  app.get('/uploads/*', async (request, reply) => {
    const rawPath = request.url.replace('/uploads/', '');
    const safePath = path.normalize(rawPath).replace(/^(\.\.[\/\\])+/, '');
    const filePath = path.resolve(process.cwd(), 'uploads', safePath);

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const stream = fs.createReadStream(filePath);
      return reply.type('image/jpeg').send(stream);
    }
    return reply.status(404).send({ error: 'File not found' });
  });

  return app;
}
