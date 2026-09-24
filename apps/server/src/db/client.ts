import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from '../config/config';
import * as schema from './schema/index';

export const queryClient = postgres(config.db.url, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(queryClient, { schema });

export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const result = await queryClient`SELECT 1 as alive`;
    return Array.isArray(result) && result.length > 0;
  } catch (error) {
    return false;
  }
}

export async function closeDatabaseConnection(): Promise<void> {
  await queryClient.end();
}
