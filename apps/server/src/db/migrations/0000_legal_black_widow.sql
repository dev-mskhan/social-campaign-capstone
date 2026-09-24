CREATE TABLE IF NOT EXISTS "health_check" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" text NOT NULL,
	"checked_at" timestamp DEFAULT now() NOT NULL
);
