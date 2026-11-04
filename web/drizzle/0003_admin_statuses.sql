ALTER TABLE "programs" DROP CONSTRAINT "programs_status_check";--> statement-breakpoint
ALTER TABLE "venues" DROP CONSTRAINT "venues_status_check";--> statement-breakpoint
ALTER TABLE "programs" ADD CONSTRAINT "programs_status_check" CHECK ("programs"."status" in ('active', 'sold_out', 'past', 'draft', 'archived'));--> statement-breakpoint
ALTER TABLE "venues" ADD CONSTRAINT "venues_status_check" CHECK ("venues"."status" in ('active', 'closed', 'draft', 'archived'));