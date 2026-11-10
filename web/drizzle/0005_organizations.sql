CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"kind" text DEFAULT 'operator' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"website" text,
	"description" text,
	"country" text,
	"sports" text[] DEFAULT '{}' NOT NULL,
	"aliases" text[] DEFAULT '{}' NOT NULL,
	"note" text,
	"source_url" text,
	"seen_on_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug"),
	CONSTRAINT "organizations_kind_check" CHECK ("organizations"."kind" in ('operator', 'marketplace')),
	CONSTRAINT "organizations_status_check" CHECK ("organizations"."status" in ('active', 'lead', 'archived'))
);
--> statement-breakpoint
ALTER TABLE "programs" ADD COLUMN "operator_id" uuid;--> statement-breakpoint
ALTER TABLE "programs" ADD COLUMN "sold_through_id" uuid;--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_seen_on_id_organizations_id_fk" FOREIGN KEY ("seen_on_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_name_idx" ON "organizations" USING btree (lower("name"));--> statement-breakpoint
ALTER TABLE "programs" ADD CONSTRAINT "programs_operator_id_organizations_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programs" ADD CONSTRAINT "programs_sold_through_id_organizations_id_fk" FOREIGN KEY ("sold_through_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "programs_operator_idx" ON "programs" USING btree ("operator_id");
--> statement-breakpoint
-- Every organiser name already on a programme becomes an operator; names that only differ in case or punctuation share one.
INSERT INTO "organizations" ("slug", "name")
SELECT DISTINCT ON ("slug") "slug", "name" FROM (
  SELECT trim(both '-' from regexp_replace(translate(lower(trim("organizer")), 'àáâãäåçèéêëìíîïñòóôõöøùúûüýÿ', 'aaaaaaceeeeiiiinoooooouuuuyy'), '[^a-z0-9]+', '-', 'g')) AS "slug", trim("organizer") AS "name" FROM "programs"
) s WHERE "slug" <> '' ORDER BY "slug", "name"
ON CONFLICT DO NOTHING;
--> statement-breakpoint
UPDATE "programs" p SET "operator_id" = o."id" FROM "organizations" o
WHERE p."operator_id" IS NULL AND lower(o."name") = lower(trim(p."organizer"));
--> statement-breakpoint
UPDATE "programs" p SET "operator_id" = o."id" FROM "organizations" o
WHERE p."operator_id" IS NULL AND o."slug" = trim(both '-' from regexp_replace(translate(lower(trim(p."organizer")), 'àáâãäåçèéêëìíîïñòóôõöøùúûüýÿ', 'aaaaaaceeeeiiiinoooooouuuuyy'), '[^a-z0-9]+', '-', 'g'));
--> statement-breakpoint
-- Marketplaces and directories met during the first harvest (harvest/SOURCES.md)
INSERT INTO "organizations" ("slug", "name", "kind", "website", "note") VALUES
  ('bookretreats', 'BookRetreats', 'marketplace', 'https://bookretreats.com/', 'Retreat marketplace: takes the booking and payment, and hosts must give it their lowest price.'),
  ('weebora', 'Weebora', 'marketplace', 'https://weebora.com/', 'Padel trip marketplace: takes a 30% deposit by card or bank transfer.'),
  ('the-padel-circle', 'The Padel Circle', 'marketplace', 'https://www.thepadelcircle.com/', 'Padel camp directory: bookings go through its own enquiry form, and camp pages don''t link to the organiser.'),
  ('tennistraveller', 'TennisTraveller', 'marketplace', 'https://www.tennistraveller.net/', 'Tennis camp and tennis hotel directory.'),
  ('world-tennis-travel', 'World Tennis Travel', 'marketplace', 'https://www.worldtennistravel.com/', 'Sells tennis holidays, including Thanyapura and Melbourne Park packages; ownership not clear.')
ON CONFLICT DO NOTHING;
--> statement-breakpoint
-- Leads from the first harvest: operators we know of but haven't listed yet, and why
INSERT INTO "organizations" ("slug", "name", "status", "website", "sports", "country", "note", "source_url", "seen_on_id")
SELECT v."slug", v."name", 'lead', v."website", v."sports", v."country", v."note", v."source_url", m."id"
FROM (VALUES
  ('the-padel-retreat-bali', 'The Padel Retreat Bali', NULL, ARRAY['padel']::text[], 'Indonesia', 'Padel weeks in Uluwatu and Ubud run by Sara and Chris. Found only on BookRetreats and The Padel Circle, with no site of their own.', 'https://bookretreats.com/organizers/o/sara-and-chris', 'bookretreats'),
  ('socal-wellness-retreats', 'SoCal Wellness Retreats', 'https://www.socalwellnessretreats.com/pickle-ball', ARRAY['pickleball']::text[], 'Indonesia', 'John Quirk''s 10-day Bali pickleball retreat, 21-30 Jan 2027, for 3.0-4.0 players, from US$5,977, sold on BookRetreats. His own site redirected to a dead domain on 5 Nov 2026.', 'https://bookretreats.com/r/10-day-pickleball-retreat-in-paradise-bali-indonesia', 'bookretreats'),
  ('phuket-padel-lifestyle-camp', 'Phuket Padel Lifestyle Camp', NULL, ARRAY['padel']::text[], 'Thailand', '6-day camps Jan-Mar 2027 from US$1,790. Only on The Padel Circle, which doesn''t name the organiser.', 'https://www.thepadelcircle.com/best-padel-camps/full-week', 'the-padel-circle'),
  ('da-nang-hoi-an-hue-padel-retreat', 'Da Nang, Hoi An & Hue Padel Retreat', NULL, ARRAY['padel']::text[], 'Vietnam', 'Seen on The Padel Circle with April and September 2027 dates; organiser not named.', 'https://www.thepadelcircle.com/padel-camps/spain-padel-competition-camp-adult-daily-at-rafa-nadal-academy', 'the-padel-circle'),
  ('destination-padel-club', 'Destination Padel Club', NULL, ARRAY['padel']::text[], 'Thailand', 'Runs Phuket Padel Escape, a 4-day trip sold on Weebora.', 'https://weebora.com/en/destinations/phuket/destination-padel-club/phuket-padel-escape', 'weebora'),
  ('annabel-croft-padel-academy', 'Annabel Croft Padel Academy', 'https://www.pinecliffs.com/en/golf-sports/padel/', ARRAY['padel']::text[], 'Portugal', 'At Pine Cliffs in the Algarve. The padel page may list weekly adult courses the tennis page doesn''t.', NULL, NULL),
  ('pickleball-cruises', 'Pickleball Cruises', 'https://pickleballcruises.com/', ARRAY['pickleball']::text[], NULL, 'The site''s HTTPS certificate had expired on 4 Nov 2026; check it''s still running.', NULL, NULL),
  ('jsl-events', 'JSL Events', 'https://www.jsl-events.de/', ARRAY['tennis']::text[], 'Germany', 'Tennis trips; the trips page was gone (404) on 4 Nov 2026. Find the current one.', 'https://www.jsl-events.de/reisen/', NULL),
  ('como-maalifushi', 'COMO Maalifushi', 'https://comohotels.com/stories/head-in-the-game', ARRAY['padel']::text[], 'Maldives', 'Ran a padel camp with Rafa Nadal Academy in Oct 2024 and opened a new padel court in 2026. Watch for camp dates.', NULL, NULL),
  ('thanyapura', 'Thanyapura', 'https://www.thanyapura-phuket.com/', ARRAY['tennis']::text[], 'Thailand', 'Adult tennis packages (3, 5 and 8 days) and a 5-day tennis retreat. The site refuses automated requests, so the harvest can''t read it.', 'https://www.thanyapura-phuket.com/promotion/5days-4nights-tennis-holiday/', NULL),
  ('liga-tennis', 'Liga.Tennis', 'https://liga.tennis/', ARRAY['tennis']::text[], 'Indonesia', 'Adult tennis camps in Canggu, Sanur, Nusa Dua and Ubud. The site refuses automated requests.', 'https://liga.tennis/ltca/program/tennis-camps', NULL),
  ('padel-pickleball-retreats', 'Padel Pickleball Retreats', 'https://padelpickleballretreats.com/', ARRAY['pickleball']::text[], 'Indonesia', '7-day Bali pickleball retreat in Canggu and Ubud; the site didn''t answer on 5 Nov 2026.', 'https://padelpickleballretreats.com/pages/bali-pickleball-retreat-canggu-and-ubud', NULL),
  ('paradise-island-pickleball', 'Paradise Island Pickleball', 'https://paradiseislandpickleball.com/', ARRAY['pickleball']::text[], 'Indonesia', 'Bali pickleball trips. Still said ''2026 dates coming soon'' in Nov 2026, and its last event was July 2024, so it looks dormant.', NULL, NULL),
  ('matchpoint-international', 'Matchpoint International', 'https://www.matchpointinternational.com/', ARRAY['tennis']::text[], 'Canada', 'Tennis camps at Mont-Tremblant; the site only builds in a browser and timed out (Nov 2026).', NULL, NULL),
  ('elite-pickleball-retreats', 'Elite Pickleball Retreats', 'https://www.elitepickleballretreats.com/', ARRAY['pickleball']::text[], 'United States', 'US pickleball retreats; its trips only load in a browser, so the harvest couldn''t read them (Nov 2026); the refresh on the Mac will try again.', 'https://www.elitepickleballretreats.com/trip', NULL),
  ('us-pickleball-camps', 'US Pickleball Camps', 'https://uspickleballcamps.com/', ARRAY['pickleball']::text[], 'United States', 'Camps across the US; its trips only load in a browser, so the harvest couldn''t read them (Nov 2026); the refresh on the Mac will try again.', 'https://uspickleballcamps.com/locations', NULL),
  ('road-scholar', 'Road Scholar', 'https://www.roadscholar.org/', ARRAY['pickleball']::text[], 'United States', 'Pickleball programmes for older adults; its trips only load in a browser, so the harvest couldn''t read them (Nov 2026); the refresh on the Mac will try again.', 'https://www.roadscholar.org/collections/pickleball/', NULL),
  ('level-up-pickleball-camps', 'Level Up Pickleball Camps', 'https://www.leveluppickleballcamps.com/', ARRAY['pickleball']::text[], 'United States', 'Camps by state; its trips only load in a browser, so the harvest couldn''t read them (Nov 2026); the refresh on the Mac will try again.', 'https://www.leveluppickleballcamps.com/by-state', NULL),
  ('pickleballtrips-net', 'PickleballTrips.net', 'https://pickleballtrips.net/', ARRAY['pickleball']::text[], 'United States', 'Pickleball trips; its trips only load in a browser, so the harvest couldn''t read them (Nov 2026); the refresh on the Mac will try again.', 'https://pickleballtrips.net/upcoming', NULL),
  ('four-seasons-kuda-huraa', 'Four Seasons Resort Maldives at Kuda Huraa', 'https://www.fourseasons.com/maldiveskh/', ARRAY['tennis']::text[], 'Maldives', 'Tennis academy with visiting pros; a bot check blocks every automated request.', 'https://www.fourseasons.com/maldiveskh/services-and-amenities/tennis/', NULL)
) AS v("slug", "name", "website", "sports", "country", "note", "source_url", "seen_on")
LEFT JOIN "organizations" m ON m."slug" = v."seen_on"
ON CONFLICT DO NOTHING;
--> statement-breakpoint
-- the names the harvest reports used for some of these leads, so later imports recognise them
UPDATE "organizations" o SET "aliases" = v."aliases" FROM (VALUES
  ('the-padel-retreat-bali', ARRAY['The Padel Retreat Bali (Sara and Chris)']::text[]),
  ('destination-padel-club', ARRAY['Phuket Padel Escape (Destination Padel Club)']::text[]),
  ('socal-wellness-retreats', ARRAY['10-day pickleball retreat in Bali (host: John Quirk)', 'John Quirk']::text[]),
  ('annabel-croft-padel-academy', ARRAY['Annabel Croft Padel Academy (Pine Cliffs)']::text[])
) AS v("slug", "aliases")
WHERE o."slug" = v."slug" AND o."aliases" = '{}';
