#!/usr/bin/env node
/**
 * Loads seed/programs.json and seed/venues.json into Postgres (npm run db:seed).
 *
 * The database is the source of truth; seed/*.json is an import format. Each record is upserted by
 * slug, and its sessions, courts and photos are replaced by the file's. Records that are only in the
 * database are left alone. Everything happens in one transaction, so a bad record changes nothing.
 *
 * Photo paths come from data/photos.json, which scripts/seed.py writes after downloading the photos.
 *
 *   npm run db:seed              upsert every record in seed/
 *   npm run db:seed -- --if-empty  only when the database has no programs yet (the build runs this,
 *                                  so a new database, production or a preview branch, starts with
 *                                  the seed and is never overwritten afterwards)
 */
import { neon } from "@neondatabase/serverless";
import { readFile } from "node:fs/promises";
import path from "node:path";

const WEB = path.dirname(path.dirname(new URL(import.meta.url).pathname));
const SEED = path.join(WEB, "..", "seed");
const MANIFEST = path.join(WEB, "data", "photos.json");

// Shown in each sport's hero carousel, in this order. Each needs a cover photo at least ~1200px wide.
// Stored as programs.featured_rank; once imported, change it in the database.
const FEATURED = {
  tennis: ["ikos-kissamos-tennis-holiday", "sani-beach-tennis-holiday", "zanzanu-tennis-camp-lake-garda"],
  pickleball: ["pickleball-getaways-club-med-turkoise", "pickleball-in-paradise-la-toc", "active-away-pickleball-vilamoura"],
  padel: ["active-away-padel-nana-golden-beach", "rafa-nadal-academy-padel-camp", "active-away-padel-vilamoura"],
};

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
const ifEmpty = process.argv.includes("--if-empty");
if (!url) {
  if (ifEmpty && !process.env.VERCEL) {
    console.log("db:seed: no DATABASE_URL, skipping");
    process.exit(0);
  }
  console.error("DATABASE_URL is not set. Locally, run `npx neon checkout dev` in web/ first.");
  process.exit(1);
}
const sql = neon(url);

if (ifEmpty) {
  const [{ any }] = await sql`select exists (select 1 from programs) as any`;
  if (any) {
    console.log("db:seed: database already has listings, leaving them alone");
    process.exit(0);
  }
}

const readJson = async (file) => JSON.parse(await readFile(file, "utf8"));
const programs = await readJson(path.join(SEED, "programs.json"));
const venues = await readJson(path.join(SEED, "venues.json"));
const manifest = await readJson(MANIFEST).catch(() => {
  console.error(`${path.relative(process.cwd(), MANIFEST)} is missing; run python3 scripts/seed.py first.`);
  process.exit(1);
});

// directory-schema.json: a record missing a required field is flagged needs_review, not dropped.
const get = (obj, dotted) => dotted.split(".").reduce((o, k) => o?.[k], obj);
const present = (v) => v != null && v !== "" && !(Array.isArray(v) && v.length === 0);
const PROGRAM_REQUIRED = ["core_identity.title", "categorization.category", "core_identity.organizer", "categorization.racket_sport", "location.country", "categorization.level"];
const VENUE_REQUIRED = ["core_identity.name", "core_identity.kind", "location.country", "facilities.racket_sport"];
const warnings = [];
function needsReview(record, required, slug, isProgram) {
  const missing = required.filter((f) => !present(get(record, f)));
  if (isProgram) {
    // dates_rule and url_rule
    if (!record.sessions?.some((s) => s.start_date && s.end_date) && !present(record.schedule_notes))
      missing.push("sessions or schedule_notes");
    if (!present(record.core_identity?.booking_url) && !present(record.meta?.source_url)) missing.push("booking_url or source_url");
  }
  if (missing.length) warnings.push(`${slug}: missing ${missing.join(", ")}; flagged needs_review`);
  return (record.meta.needs_review ?? true) || missing.length > 0;
}

const slugs = (list) => list.map((r) => r.meta.slug);
for (const [kind, list] of [["program", programs], ["venue", venues]]) {
  const dupes = slugs(list).filter((s, i, all) => all.indexOf(s) !== i);
  if (dupes.length) throw new Error(`duplicate ${kind} slugs in seed/: ${dupes.join(", ")}`);
}
const venueSlugs = new Set(slugs(venues));
const featured = Object.fromEntries(Object.values(FEATURED).flatMap((list) => list.map((slug, i) => [slug, i + 1])));
for (const slug of Object.keys(featured))
  if (!programs.some((p) => p.meta.slug === slug)) warnings.push(`featured program ${slug} is not in seed/programs.json`);

const venueRows = venues.map((v) => ({
  id: v.meta.id,
  slug: v.meta.slug,
  source_url: v.meta.source_url,
  status: v.meta.status ?? "draft",
  needs_review: needsReview(v, VENUE_REQUIRED, v.meta.slug, false),
  scraped_at: v.meta.scraped_at,
  last_seen_at: v.meta.last_seen_at,
  name: v.core_identity.name,
  kind: v.core_identity.kind,
  stars: v.core_identity.stars,
  adults_only: v.core_identity.adults_only ?? false,
  description: v.core_identity.description,
  website: v.core_identity.website,
  country: v.location.country,
  city_region: v.location.city_region,
  lat: v.location.lat,
  lng: v.location.lng,
  sports: v.facilities.racket_sport,
  amenities: v.facilities.amenities ?? [],
  price_notes: v.pricing?.price_notes,
}));

const programRows = programs.map((p) => {
  const venueSlug = p.location.venue_slug;
  if (venueSlug && !venueSlugs.has(venueSlug))
    warnings.push(`${p.meta.slug}: venue ${venueSlug} is not in seed/venues.json; linked only if it's already in the database`);
  return {
    id: p.meta.id,
    slug: p.meta.slug,
    source_url: p.meta.source_url,
    status: p.meta.status ?? "draft",
    needs_review: needsReview(p, PROGRAM_REQUIRED, p.meta.slug, true),
    scraped_at: p.meta.scraped_at,
    last_seen_at: p.meta.last_seen_at,
    data_quality_score: p.meta.data_quality_score,
    title: p.core_identity.title,
    organizer: p.core_identity.organizer,
    description: p.core_identity.description,
    coaches: p.core_identity.coaches ?? [],
    languages: p.core_identity.languages ?? [],
    // url_rule: booking_url falls back to source_url
    booking_url: p.core_identity.booking_url || p.meta.source_url,
    contact_email: p.core_identity.contact_email,
    contact_phone: p.core_identity.contact_phone,
    sports: p.categorization.racket_sport,
    category: p.categorization.category,
    theme: p.categorization.theme ?? [],
    gender: p.categorization.gender,
    level: p.categorization.level,
    ratings: p.rating_systems ?? {},
    country: p.location.country,
    city_region: p.location.city_region,
    venue_name: p.location.venue_name,
    venue_slug: venueSlug,
    lat: p.location.lat,
    lng: p.location.lng,
    schedule_notes: p.schedule_notes,
    price_min: p.pricing.price_min,
    price_max: p.pricing.price_max,
    currency: p.pricing.currency,
    price_unit: p.pricing.price_unit,
    price_notes: p.pricing.price_notes,
    inclusions: p.pricing.inclusions ?? [],
    court_surfaces: p.sport_specific.court_surface ?? [],
    coaching_hours_total: p.sport_specific.coaching_hours_total,
    player_to_coach_ratio: p.sport_specific.player_to_coach_ratio,
    capacity: p.sport_specific.capacity,
    accommodation_type: p.sport_specific.accommodation_type,
    featured_rank: featured[p.meta.slug] ?? null,
  };
});

const sessionRows = programs.flatMap((p) =>
  p.sessions.map((s) => ({
    program_slug: p.meta.slug,
    start_date: s.start_date,
    end_date: s.end_date,
    status: s.status ?? "available",
    price_override: s.price_override ?? null,
    booking_url: s.booking_url ?? null,
  })),
);

const courtRows = venues.flatMap((v) =>
  (v.facilities.courts ?? []).map((c, position) => ({ venue_slug: v.meta.slug, position, ...c, indoor: c.indoor ?? false })),
);

function photoRows(kind, list) {
  return list.flatMap((r) => {
    const files = manifest[kind]?.[r.meta.slug];
    if (!files) warnings.push(`${r.meta.slug}: no photos in data/photos.json (run python3 scripts/seed.py)`);
    return (files ?? []).map((f, position) => ({ slug: r.meta.slug, position, path: f.path, source_url: f.source }));
  });
}
const programPhotos = photoRows("programs", programs);
const venuePhotos = photoRows("venues", venues);

const json = (rows) => JSON.stringify(rows);
const venueSlugList = slugs(venues);
const programSlugList = slugs(programs);

// Upserts go through jsonb_to_recordset: one statement per table, whatever the number of records.
// Existing rows keep their id, so foreign keys and links stay valid.
await sql.transaction([
  sql`
    insert into venues (id, slug, source_url, status, needs_review, scraped_at, last_seen_at, name, kind, stars,
      adults_only, description, website, country, city_region, lat, lng, sports, amenities, price_notes)
    select coalesce(id, gen_random_uuid()), slug, source_url, status, needs_review, scraped_at, last_seen_at, name, kind,
      stars, adults_only, description, website, country, city_region, lat, lng, sports, amenities, price_notes
    from jsonb_to_recordset(${json(venueRows)}::jsonb) as x(id uuid, slug text, source_url text, status text,
      needs_review boolean, scraped_at timestamptz, last_seen_at timestamptz, name text, kind text, stars int,
      adults_only boolean, description text, website text, country text, city_region text, lat float8, lng float8,
      sports text[], amenities jsonb, price_notes text)
    on conflict (slug) do update set
      source_url = excluded.source_url, status = excluded.status, needs_review = excluded.needs_review,
      scraped_at = excluded.scraped_at, last_seen_at = excluded.last_seen_at, name = excluded.name,
      kind = excluded.kind, stars = excluded.stars, adults_only = excluded.adults_only,
      description = excluded.description, website = excluded.website, country = excluded.country,
      city_region = excluded.city_region, lat = excluded.lat, lng = excluded.lng, sports = excluded.sports,
      amenities = excluded.amenities, price_notes = excluded.price_notes, updated_at = now()`,
  sql`delete from courts where venue_id in (select id from venues where slug = any(${venueSlugList}))`,
  sql`
    insert into courts (venue_id, position, sport, count, surface, indoor)
    select v.id, x.position, x.sport, x.count, x.surface, x.indoor
    from jsonb_to_recordset(${json(courtRows)}::jsonb) as x(venue_slug text, position int, sport text, count int,
      surface text, indoor boolean)
    join venues v on v.slug = x.venue_slug`,
  sql`
    insert into programs (id, slug, source_url, status, needs_review, scraped_at, last_seen_at, data_quality_score,
      title, organizer, description, coaches, languages, booking_url, contact_email, contact_phone, sports, category,
      theme, gender, level, ratings, country, city_region, venue_name, venue_id, lat, lng, schedule_notes, price_min,
      price_max, currency, price_unit, price_notes, inclusions, court_surfaces, coaching_hours_total,
      player_to_coach_ratio, capacity, accommodation_type, featured_rank)
    select coalesce(x.id, gen_random_uuid()), x.slug, x.source_url, x.status, x.needs_review, x.scraped_at,
      x.last_seen_at, x.data_quality_score, x.title, x.organizer, x.description, x.coaches, x.languages, x.booking_url,
      x.contact_email, x.contact_phone, x.sports, x.category, x.theme, x.gender, x.level, x.ratings, x.country,
      x.city_region, x.venue_name, v.id, x.lat, x.lng, x.schedule_notes, x.price_min, x.price_max, x.currency,
      x.price_unit, x.price_notes, x.inclusions, x.court_surfaces, x.coaching_hours_total, x.player_to_coach_ratio,
      x.capacity, x.accommodation_type, x.featured_rank
    from jsonb_to_recordset(${json(programRows)}::jsonb) as x(id uuid, slug text, source_url text, status text,
      needs_review boolean, scraped_at timestamptz, last_seen_at timestamptz, data_quality_score real, title text,
      organizer text, description text, coaches text[], languages text[], booking_url text, contact_email text,
      contact_phone text, sports text[], category text, theme text[], gender text, level text[], ratings jsonb,
      country text, city_region text, venue_name text, venue_slug text, lat float8, lng float8, schedule_notes text,
      price_min numeric, price_max numeric, currency text, price_unit text, price_notes text, inclusions jsonb,
      court_surfaces text[], coaching_hours_total numeric, player_to_coach_ratio text, capacity int,
      accommodation_type text, featured_rank int)
    left join venues v on v.slug = x.venue_slug
    on conflict (slug) do update set
      source_url = excluded.source_url, status = excluded.status, needs_review = excluded.needs_review,
      scraped_at = excluded.scraped_at, last_seen_at = excluded.last_seen_at,
      data_quality_score = excluded.data_quality_score, title = excluded.title, organizer = excluded.organizer,
      description = excluded.description, coaches = excluded.coaches, languages = excluded.languages,
      booking_url = excluded.booking_url, contact_email = excluded.contact_email,
      contact_phone = excluded.contact_phone, sports = excluded.sports, category = excluded.category,
      theme = excluded.theme, gender = excluded.gender, level = excluded.level, ratings = excluded.ratings,
      country = excluded.country, city_region = excluded.city_region, venue_name = excluded.venue_name,
      venue_id = excluded.venue_id, lat = excluded.lat, lng = excluded.lng, schedule_notes = excluded.schedule_notes,
      price_min = excluded.price_min, price_max = excluded.price_max, currency = excluded.currency,
      price_unit = excluded.price_unit, price_notes = excluded.price_notes, inclusions = excluded.inclusions,
      court_surfaces = excluded.court_surfaces, coaching_hours_total = excluded.coaching_hours_total,
      player_to_coach_ratio = excluded.player_to_coach_ratio, capacity = excluded.capacity,
      accommodation_type = excluded.accommodation_type, featured_rank = excluded.featured_rank, updated_at = now()`,
  sql`delete from sessions where program_id in (select id from programs where slug = any(${programSlugList}))`,
  sql`
    insert into sessions (program_id, start_date, end_date, status, price_override, booking_url)
    select p.id, x.start_date, x.end_date, x.status, x.price_override, x.booking_url
    from jsonb_to_recordset(${json(sessionRows)}::jsonb) as x(program_slug text, start_date date, end_date date,
      status text, price_override numeric, booking_url text)
    join programs p on p.slug = x.program_slug`,
  sql`
    delete from photos
    where program_id in (select id from programs where slug = any(${programSlugList}))
       or venue_id in (select id from venues where slug = any(${venueSlugList}))`,
  sql`
    insert into photos (program_id, position, path, source_url)
    select p.id, x.position, x.path, x.source_url
    from jsonb_to_recordset(${json(programPhotos)}::jsonb) as x(slug text, position int, path text, source_url text)
    join programs p on p.slug = x.slug`,
  sql`
    insert into photos (venue_id, position, path, source_url)
    select v.id, x.position, x.path, x.source_url
    from jsonb_to_recordset(${json(venuePhotos)}::jsonb) as x(slug text, position int, path text, source_url text)
    join venues v on v.slug = x.slug`,
]);

for (const w of warnings) console.warn(`db:seed: warning: ${w}`);
console.log(
  `db:seed: loaded ${programRows.length} programs (${sessionRows.length} sessions), ` +
    `${venueRows.length} venues (${courtRows.length} courts) and ${programPhotos.length + venuePhotos.length} photos`,
);
