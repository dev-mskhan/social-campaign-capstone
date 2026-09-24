import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const healthCheckTable = pgTable('health_check', {
  id: uuid('id').defaultRandom().primaryKey(),
  status: text('status').notNull(),
  checkedAt: timestamp('checked_at').defaultNow().notNull(),
});
