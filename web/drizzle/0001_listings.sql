CREATE TABLE "courts" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "courts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"venue_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"sport" text NOT NULL,
	"count" integer,
	"surface" text,
	"indoor" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "photos" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "photos_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"program_id" uuid,
	"venue_id" uuid,
	"position" integer NOT NULL,
	"path" text NOT NULL,
	"source_url" text,
	CONSTRAINT "photos_owner_check" CHECK (num_nonnulls("photos"."program_id", "photos"."venue_id") = 1)
);
--> statement-breakpoint
CREATE TABLE "programs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"source_url" text,
	"needs_review" boolean DEFAULT true NOT NULL,
	"scraped_at" timestamp with time zone,
	"last_seen_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"data_quality_score" real,
	"title" text NOT NULL,
	"organizer" text NOT NULL,
	"description" text,
	"coaches" text[] DEFAULT '{}' NOT NULL,
	"languages" text[] DEFAULT '{}' NOT NULL,
	"booking_url" text NOT NULL,
	"contact_email" text,
	"contact_phone" text,
	"sports" text[] NOT NULL,
	"category" text NOT NULL,
	"theme" text[] DEFAULT '{}' NOT NULL,
	"gender" text,
	"level" text[] NOT NULL,
	"ratings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"country" text NOT NULL,
	"city_region" text,
	"venue_name" text,
	"venue_id" uuid,
	"lat" double precision,
	"lng" double precision,
	"schedule_notes" text,
	"price_min" numeric,
	"price_max" numeric,
	"currency" text,
	"price_unit" text,
	"price_notes" text,
	"inclusions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"court_surfaces" text[] DEFAULT '{}' NOT NULL,
	"coaching_hours_total" numeric,
	"player_to_coach_ratio" text,
	"capacity" integer,
	"accommodation_type" text,
	"featured_rank" integer,
	CONSTRAINT "programs_slug_unique" UNIQUE("slug"),
	CONSTRAINT "programs_status_check" CHECK ("programs"."status" in ('active', 'sold_out', 'past', 'draft')),
	CONSTRAINT "programs_category_check" CHECK ("programs"."category" in ('camp', 'clinic', 'social_getaway'))
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "sessions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"program_id" uuid NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"status" text DEFAULT 'available' NOT NULL,
	"price_override" numeric,
	"booking_url" text,
	CONSTRAINT "sessions_status_check" CHECK ("sessions"."status" in ('available', 'waitlist', 'sold_out')),
	CONSTRAINT "sessions_dates_check" CHECK ("sessions"."end_date" >= "sessions"."start_date")
);
--> statement-breakpoint
CREATE TABLE "venues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"source_url" text,
	"needs_review" boolean DEFAULT true NOT NULL,
	"scraped_at" timestamp with time zone,
	"last_seen_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"stars" integer,
	"adults_only" boolean DEFAULT false NOT NULL,
	"description" text,
	"website" text,
	"country" text NOT NULL,
	"city_region" text,
	"lat" double precision,
	"lng" double precision,
	"sports" text[] NOT NULL,
	"amenities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"price_notes" text,
	CONSTRAINT "venues_slug_unique" UNIQUE("slug"),
	CONSTRAINT "venues_status_check" CHECK ("venues"."status" in ('active', 'closed', 'draft')),
	CONSTRAINT "venues_kind_check" CHECK ("venues"."kind" in ('resort', 'hotel', 'club', 'academy'))
);
--> statement-breakpoint
ALTER TABLE "courts" ADD CONSTRAINT "courts_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photos" ADD CONSTRAINT "photos_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photos" ADD CONSTRAINT "photos_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programs" ADD CONSTRAINT "programs_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "courts_venue_position_idx" ON "courts" USING btree ("venue_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "photos_program_position_idx" ON "photos" USING btree ("program_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "photos_venue_position_idx" ON "photos" USING btree ("venue_id","position");--> statement-breakpoint
CREATE INDEX "programs_venue_idx" ON "programs" USING btree ("venue_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_program_start_idx" ON "sessions" USING btree ("program_id","start_date");--> statement-breakpoint
CREATE INDEX "sessions_start_idx" ON "sessions" USING btree ("start_date");