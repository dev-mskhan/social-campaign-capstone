import { pgTable, text, timestamp, uuid, varchar, jsonb } from 'drizzle-orm/pg-core';

export const platformTokens = pgTable('platform_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  platform: varchar('platform', { length: 50 }).notNull().unique(), // 'instagram' | 'x'
  encryptedToken: text('encrypted_token').notNull(), // AES-256-GCM cipher text
  iv: varchar('iv', { length: 255 }).notNull(), // Random IV for encryption
  authMetadata: jsonb('auth_metadata'), // Non-sensitive token metadata (scopes, expiration timestamp, token_type)
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type PlatformTokenRecord = typeof platformTokens.$inferSelect;
export type NewPlatformTokenRecord = typeof platformTokens.$inferInsert;
