import { pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const campaigns = pgTable('campaigns', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  body: text('body').notNull(),
  sourceUrl: varchar('source_url', { length: 1024 }),
  sourceImageUrl: varchar('source_image_url', { length: 1024 }),
  status: varchar('status', { length: 50 }).default('scheduled').notNull(),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type CampaignRecord = typeof campaigns.$inferSelect;
export type NewCampaignRecord = typeof campaigns.$inferInsert;
