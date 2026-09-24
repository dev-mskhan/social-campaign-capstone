CREATE TABLE IF NOT EXISTS "campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"body" text NOT NULL,
	"source_url" varchar(1024),
	"source_image_url" varchar(1024),
	"status" varchar(50) DEFAULT 'scheduled' NOT NULL,
	"scheduled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "social_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"platform" varchar(50) NOT NULL,
	"caption" text NOT NULL,
	"image_variant_url" varchar(1024) NOT NULL,
	"status" varchar(50) DEFAULT 'queued' NOT NULL,
	"idempotency_key" varchar(255) NOT NULL,
	"external_post_id" varchar(255),
	"retry_count" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"scheduled_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "social_posts_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "platform_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"platform" varchar(50) NOT NULL,
	"encrypted_token" text NOT NULL,
	"iv" varchar(255) NOT NULL,
	"auth_metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "platform_tokens_platform_unique" UNIQUE("platform")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "social_posts" ADD CONSTRAINT "social_posts_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "campaign_platform_idx" ON "social_posts" USING btree ("campaign_id","platform");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "social_posts_status_idx" ON "social_posts" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "social_posts_idempotency_idx" ON "social_posts" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "social_posts_scheduled_at_idx" ON "social_posts" USING btree ("scheduled_at");