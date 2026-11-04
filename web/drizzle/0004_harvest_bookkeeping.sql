ALTER TABLE "programs" ADD COLUMN "listing_url" text;--> statement-breakpoint
ALTER TABLE "programs" ADD COLUMN "missed_runs" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "programs" ADD COLUMN "pending_changes" jsonb;