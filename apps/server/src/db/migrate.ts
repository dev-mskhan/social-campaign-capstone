import path from 'node:path';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { logger } from '../infrastructure/logger';
import { closeDatabaseConnection, db } from './client';

export async function runMigrations(): Promise<void> {
  const migrationsFolder = path.join(process.cwd(), 'src', 'db', 'migrations');
  logger.info({ migrationsFolder }, 'Running database migrations...');

  try {
    await migrate(db, { migrationsFolder });
    logger.info('Database migrations completed successfully.');
  } catch (error) {
    logger.error({ error }, 'Database migration failed.');
    throw error;
  }
}

const isDirectRun =
  process.argv[1] &&
  (process.argv[1].endsWith('migrate.ts') || process.argv[1].endsWith('migrate.js'));

if (isDirectRun) {
  runMigrations()
    .then(async () => {
      await closeDatabaseConnection();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('Migration script failed:', err);
      await closeDatabaseConnection();
      process.exit(1);
    });
}
