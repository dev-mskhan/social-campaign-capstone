import { buildApp } from './app/app';
import { config } from './config/config';
import { closeDatabaseConnection } from './db/client';
import { closeRedisConnection } from './infrastructure/redis/client';

async function startServer() {
  const app = buildApp();

  const shutdown = async (signal: string) => {
    app.log.info({ signal }, 'Shutting down Fastify server gracefully...');
    try {
      await app.close();
      await closeDatabaseConnection();
      await closeRedisConnection();
      app.log.info('Server and infrastructure resources closed cleanly.');
      process.exit(0);
    } catch (error) {
      app.log.error({ error }, 'Error during server shutdown.');
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('uncaughtException', (error) => {
    app.log.fatal({ error }, 'Uncaught exception detected!');
    shutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason) => {
    app.log.fatal({ reason }, 'Unhandled rejection detected!');
    shutdown('unhandledRejection');
  });

  try {
    await app.listen({
      port: config.server.port,
      host: config.server.host,
    });
    app.log.info(
      `🚀 Fastify Server listening at http://${config.server.host}:${config.server.port}`
    );
    app.log.info(
      `📚 Swagger Documentation available at http://${config.server.host}:${config.server.port}/docs`
    );
  } catch (err) {
    app.log.error(err, 'Failed to start Fastify server.');
    process.exit(1);
  }
}

startServer();
