import randomUUID from 'node:crypto';
import Fastify, { FastifyInstance, FastifyServerOptions } from 'fastify';
import cors from '@fastify/cors';
import { config } from '../config/config';
import { pinoLoggerOptions } from '../infrastructure/logger';
import swaggerPlugin from './plugins/swagger';
import errorHandlerPlugin from './plugins/error-handler';
import { healthRoutes } from './routes/health.routes';

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

  // 4. Register Routes under API Prefix (e.g., /api/v1)
  app.register(healthRoutes, { prefix: config.server.apiPrefix });

  // 5. Register root level health check aliases for standard probes
  app.register(healthRoutes);

  return app;
}
