CREATE TABLE "ratings" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ratings_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"organization_id" uuid,
	"venue_id" uuid,
	"source" text NOT NULL,
	"rating" real NOT NULL,
	"review_count" integer,
	"url" text NOT NULL,
	"checked_at" date DEFAULT now() NOT NULL,
	CONSTRAINT "ratings_owner_check" CHECK (num_nonnulls("ratings"."organization_id", "ratings"."venue_id") = 1),
	CONSTRAINT "ratings_source_check" CHECK ("ratings"."source" in ('google', 'trustpilot', 'tripadvisor')),
	CONSTRAINT "ratings_rating_check" CHECK ("ratings"."rating" between 0 and 5)
);
--> statement-breakpoint
ALTER TABLE "venues" ADD COLUMN "aliases" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ratings_organization_source_idx" ON "ratings" USING btree ("organization_id","source");--> statement-breakpoint
CREATE UNIQUE INDEX "ratings_venue_source_idx" ON "ratings" USING btree ("venue_id","source");