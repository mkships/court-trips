ALTER TABLE "ratings" DROP CONSTRAINT "ratings_source_check";--> statement-breakpoint
ALTER TABLE "ratings" ALTER COLUMN "url" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_source_check" CHECK ("ratings"."source" in ('google', 'tripadvisor'));