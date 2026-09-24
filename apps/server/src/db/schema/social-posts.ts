import { pgTable, text, timestamp, uuid, varchar, integer, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { campaigns } from './campaigns';

export const socialPosts = pgTable(
  'social_posts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    campaignId: uuid('campaign_id')
      .notNull()
      .references(() => campaigns.id, { onDelete: 'cascade' }),
    platform: varchar('platform', { length: 50 }).notNull(), // 'instagram' | 'x'
    caption: text('caption').notNull(),
    imageVariantUrl: varchar('image_variant_url', { length: 1024 }).notNull(),
    status: varchar('status', { length: 50 }).default('queued').notNull(), // 'queued' | 'publishing' | 'published' | 'failed'
    idempotencyKey: varchar('idempotency_key', { length: 255 }).notNull().unique(),
    externalPostId: varchar('external_post_id', { length: 255 }),
    retryCount: integer('retry_count').default(0).notNull(),
    lastError: text('last_error'),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    campaignPlatformIdx: uniqueIndex('campaign_platform_idx').on(table.campaignId, table.platform),
    statusIdx: index('social_posts_status_idx').on(table.status),
    idempotencyIdx: index('social_posts_idempotency_idx').on(table.idempotencyKey),
    scheduledAtIdx: index('social_posts_scheduled_at_idx').on(table.scheduledAt),
  })
);

export type SocialPostRecord = typeof socialPosts.$inferSelect;
export type NewSocialPostRecord = typeof socialPosts.$inferInsert;
