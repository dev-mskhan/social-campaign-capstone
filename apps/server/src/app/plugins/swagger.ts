import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { config } from '../../config/config';

const swaggerPlugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  await fastify.register(swagger, {
    openapi: {
      info: {
        title: 'Multi-Platform Social Campaign Publisher API',
        description: 'Production-ready Fastify backend foundation for Social Campaign Publisher',
        version: '1.0.0',
      },
      servers: [
        {
          url: `http://${config.server.host}:${config.server.port}`,
          description: 'Development Server',
        },
      ],
      tags: [
        { name: 'Health', description: 'Application health and readiness probes' },
      ],
    },
  });

  await fastify.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
    },
    staticCSP: true,
    transformSpecificationClone: true,
  });
};

export default fp(swaggerPlugin, {
  name: 'swagger-plugin',
});
