import { relations, sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  bigint,
  boolean,
  check,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// Listings follow directory-schema.json v2.2: `programs` is retreat_schema, `venues` is venue_schema,
// and the two repeating groups get their own tables (`sessions`, `courts`), as do photos.
// Columns are the schema's fields flattened (core_identity.title → title, location.country → country).
// Groups whose shape varies a lot from listing to listing (ratings, inclusions, amenities) are JSONB.
// Enumerated fields are text with CHECK constraints, so adding an option is a one-line migration.
// The database is the source of truth; seed/*.json is only an import format (scripts/db-seed.mjs).

const list = (values: readonly string[]) => sql.raw(values.map((v) => `'${v}'`).join(", "));

// archived: hidden and out of the review queue (a rejected draft, a retired listing); harvests skip it
export const PROGRAM_STATUSES = ["active", "sold_out", "past", "draft", "archived"] as const;
export const VENUE_STATUSES = ["active", "closed", "draft", "archived"] as const;
export const CATEGORIES = ["camp", "clinic", "social_getaway"] as const;
export const SESSION_STATUSES = ["available", "waitlist", "sold_out"] as const;
export const VENUE_KINDS = ["resort", "hotel", "club", "academy"] as const;

// meta.* fields shared by programs and venues (a function, so each table gets its own column builders)
const meta = () => ({
  id: uuid().primaryKey().defaultRandom(),
  slug: text().notNull().unique(),
  sourceUrl: text(),
  needsReview: boolean().notNull().default(true),
  scrapedAt: timestamp({ withTimezone: true }),
  lastSeenAt: timestamp({ withTimezone: true }),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const venues = pgTable(
  "venues",
  {
    ...meta(),
    status: text().$type<(typeof VENUE_STATUSES)[number]>().notNull().default("draft"),
    // core_identity
    name: text().notNull(),
    kind: text().$type<(typeof VENUE_KINDS)[number]>().notNull(),
    stars: integer(),
    adultsOnly: boolean().notNull().default(false),
    description: text(),
    website: text(),
    // location
    country: text().notNull(),
    cityRegion: text(),
    lat: doublePrecision(),
    lng: doublePrecision(),
    // facilities (courts[] is its own table)
    sports: text().array().notNull(),
    amenities: jsonb().$type<string[]>().notNull().default([]),
    // pricing
    priceNotes: text(),
    // other names listings use for this venue ("Sani Resort", "Sani Club"), so imports link them here
    aliases: text().array().notNull().default([]),
  },
  (t) => [
    check("venues_status_check", sql`${t.status} in (${list(VENUE_STATUSES)})`),
    check("venues_kind_check", sql`${t.kind} in (${list(VENUE_KINDS)})`),
  ],
);

export const courts = pgTable(
  "courts",
  {
    id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    venueId: uuid()
      .notNull()
      .references(() => venues.id, { onDelete: "cascade" }),
    // order as listed by the venue
    position: integer().notNull(),
    sport: text().notNull(),
    count: integer(),
    surface: text(),
    indoor: boolean().notNull().default(false),
  },
  (t) => [uniqueIndex("courts_venue_position_idx").on(t.venueId, t.position)],
);

// Who's behind a listing. An operator runs programmes: it sets the dates, hires the coaches and is
// responsible on the day (an academy, a coach, a resort running its own weeks, a tour operator such as
// Active Away). A marketplace lists programmes other people run, and usually takes the booking or
// payment (BookRetreats, Weebora, The Padel Circle); directories that only link out (TennisTraveller)
// are filed as marketplaces too, since we treat them the same: never listed or featured themselves.
// Booking software operators use on their own pages (WeTravel) is neither: the operator still sells.
// status: active (shown when it has public listings), lead (known, not listed yet: `note` says why
// and `sourceUrl` where we saw it, `seenOnId` the marketplace if it was one), archived (hidden).
export const ORGANIZATION_KINDS = ["operator", "marketplace"] as const;
export const ORGANIZATION_STATUSES = ["active", "lead", "archived"] as const;

export const organizations = pgTable(
  "organizations",
  {
    id: uuid().primaryKey().defaultRandom(),
    slug: text().notNull().unique(),
    name: text().notNull(),
    kind: text().$type<(typeof ORGANIZATION_KINDS)[number]>().notNull().default("operator"),
    status: text().$type<(typeof ORGANIZATION_STATUSES)[number]>().notNull().default("active"),
    website: text(),
    description: text(),
    // where they're based
    country: text(),
    // for leads, which have no listings to take sports from
    sports: text().array().notNull().default([]),
    // other spellings listings use for the same organisation, so imports link them here
    aliases: text().array().notNull().default([]),
    // internal: what to check, why it isn't listed
    note: text(),
    sourceUrl: text(),
    seenOnId: uuid().references((): AnyPgColumn => organizations.id, { onDelete: "set null" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("organizations_kind_check", sql`${t.kind} in (${list(ORGANIZATION_KINDS)})`),
    check("organizations_status_check", sql`${t.status} in (${list(ORGANIZATION_STATUSES)})`),
    uniqueIndex("organizations_name_idx").on(sql`lower(${t.name})`),
  ],
);

// A harvest's proposal for a listing someone may already have published or edited: the changed
// fields' new values (sessions as a whole set), and/or a note that it's gone from the operator's page.
export type PendingChanges = {
  foundAt: string;
  fields?: Record<string, { from: unknown; to: unknown }>;
  sessions?: { from: unknown[]; to: { start_date: string; end_date: string; status: string; price_override: number | null; booking_url: string | null }[] };
  missing?: boolean;
};

export type Ratings = { dupr_min?: number; dupr_max?: number; utr_min?: number; utr_max?: number; ntrp_min?: number; ntrp_max?: number };

export const programs = pgTable(
  "programs",
  {
    ...meta(),
    status: text().$type<(typeof PROGRAM_STATUSES)[number]>().notNull().default("draft"),
    dataQualityScore: real(),
    // core_identity
    title: text().notNull(),
    // the operator's name as shown; operatorId links the organisation record (kept in step on save)
    organizer: text().notNull(),
    operatorId: uuid().references(() => organizations.id, { onDelete: "set null" }),
    // set only when the programme can only be booked through a marketplace
    soldThroughId: uuid().references(() => organizations.id, { onDelete: "set null" }),
    description: text(),
    coaches: text().array().notNull().default([]),
    languages: text().array().notNull().default([]),
    bookingUrl: text().notNull(),
    contactEmail: text(),
    contactPhone: text(),
    // categorization
    sports: text().array().notNull(),
    category: text().$type<(typeof CATEGORIES)[number]>().notNull(),
    theme: text().array().notNull().default([]),
    gender: text().$type<"male" | "female" | "mixed">(),
    level: text().array().notNull(),
    // rating_systems
    ratings: jsonb().$type<Ratings>().notNull().default({}),
    // location; venue_slug becomes a foreign key, venue_name stays the display name
    country: text().notNull(),
    cityRegion: text(),
    venueName: text(),
    venueId: uuid().references(() => venues.id, { onDelete: "set null" }),
    lat: doublePrecision(),
    lng: doublePrecision(),
    // sessions[] is its own table; schedule_notes sits beside it
    scheduleNotes: text(),
    // pricing
    priceMin: numeric({ mode: "number" }),
    priceMax: numeric({ mode: "number" }),
    currency: text(),
    priceUnit: text().$type<"per_person" | "per_person_sharing">(),
    priceNotes: text(),
    inclusions: jsonb().$type<string[]>().notNull().default([]),
    // sport_specific
    courtSurfaces: text().array().notNull().default([]),
    coachingHoursTotal: numeric({ mode: "number" }),
    playerToCoachRatio: text(),
    capacity: integer(),
    accommodationType: text().$type<"on_site_resort" | "partner_hotel" | "villa" | "self_arranged" | "not_included">(),
    // Not in the schema: position in its sport's hero carousel on the home page; null when not featured.
    featuredRank: integer(),
    // Harvest bookkeeping (scripts/harvest-import.mjs). listingUrl: the source page (harvest/sources.csv)
    // it was found on; missedRuns: harvests of that page in a row that didn't find it; pendingChanges:
    // what a harvest found that needs a human before it's applied (see PendingChanges).
    listingUrl: text(),
    missedRuns: integer().notNull().default(0),
    pendingChanges: jsonb().$type<PendingChanges>(),
  },
  (t) => [
    check("programs_status_check", sql`${t.status} in (${list(PROGRAM_STATUSES)})`),
    check("programs_category_check", sql`${t.category} in (${list(CATEGORIES)})`),
    index("programs_venue_idx").on(t.venueId),
    index("programs_operator_idx").on(t.operatorId),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    programId: uuid()
      .notNull()
      .references(() => programs.id, { onDelete: "cascade" }),
    startDate: date().notNull(),
    endDate: date().notNull(),
    status: text().$type<(typeof SESSION_STATUSES)[number]>().notNull().default("available"),
    priceOverride: numeric({ mode: "number" }),
    bookingUrl: text(),
  },
  (t) => [
    uniqueIndex("sessions_program_start_idx").on(t.programId, t.startDate),
    index("sessions_start_idx").on(t.startDate),
    check("sessions_status_check", sql`${t.status} in (${list(SESSION_STATUSES)})`),
    check("sessions_dates_check", sql`${t.endDate} >= ${t.startDate}`),
  ],
);

// media.images for both programs and venues: one row per photo, in display order.
// `path` is the content-hashed file the site serves ("/photos/<slug>/0-1a2b3c4d5e.jpg", made by
// scripts/seed.py and uploaded to Blob); `sourceUrl` is the operator's original.
export const photos = pgTable(
  "photos",
  {
    id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    programId: uuid().references(() => programs.id, { onDelete: "cascade" }),
    venueId: uuid().references(() => venues.id, { onDelete: "cascade" }),
    position: integer().notNull(),
    path: text().notNull(),
    sourceUrl: text(),
  },
  (t) => [
    check("photos_owner_check", sql`num_nonnulls(${t.programId}, ${t.venueId}) = 1`),
    uniqueIndex("photos_program_position_idx").on(t.programId, t.position),
    uniqueIndex("photos_venue_position_idx").on(t.venueId, t.position),
  ],
);

// A public rating of an operator or a venue on another site, entered by hand in admin: the score,
// how many reviews it's based on and where to read them. We show the number and link out; no review
// text is copied. `checkedAt` is when someone last looked, shown beside the badge.
export const RATING_SOURCES = ["google", "trustpilot", "tripadvisor"] as const;

export const ratings = pgTable(
  "ratings",
  {
    id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    organizationId: uuid().references(() => organizations.id, { onDelete: "cascade" }),
    venueId: uuid().references(() => venues.id, { onDelete: "cascade" }),
    source: text().$type<(typeof RATING_SOURCES)[number]>().notNull(),
    // out of 5
    rating: real().notNull(),
    reviewCount: integer(),
    url: text().notNull(),
    checkedAt: date().notNull().defaultNow(),
  },
  (t) => [
    check("ratings_owner_check", sql`num_nonnulls(${t.organizationId}, ${t.venueId}) = 1`),
    check("ratings_source_check", sql`${t.source} in (${list(RATING_SOURCES)})`),
    check("ratings_rating_check", sql`${t.rating} between 0 and 5`),
    uniqueIndex("ratings_organization_source_idx").on(t.organizationId, t.source),
    uniqueIndex("ratings_venue_source_idx").on(t.venueId, t.source),
  ],
);

export const venuesRelations = relations(venues, ({ many }) => ({
  courts: many(courts),
  photos: many(photos),
  programs: many(programs),
  ratings: many(ratings),
}));
export const ratingsRelations = relations(ratings, ({ one }) => ({
  organization: one(organizations, { fields: [ratings.organizationId], references: [organizations.id] }),
  venue: one(venues, { fields: [ratings.venueId], references: [venues.id] }),
}));
export const courtsRelations = relations(courts, ({ one }) => ({
  venue: one(venues, { fields: [courts.venueId], references: [venues.id] }),
}));
export const organizationsRelations = relations(organizations, ({ one, many }) => ({
  programs: many(programs, { relationName: "operator" }),
  ratings: many(ratings),
  sold: many(programs, { relationName: "soldThrough" }),
  seenOn: one(organizations, { fields: [organizations.seenOnId], references: [organizations.id], relationName: "seenOn" }),
}));
export const programsRelations = relations(programs, ({ one, many }) => ({
  venue: one(venues, { fields: [programs.venueId], references: [venues.id] }),
  operator: one(organizations, { fields: [programs.operatorId], references: [organizations.id], relationName: "operator" }),
  soldThrough: one(organizations, { fields: [programs.soldThroughId], references: [organizations.id], relationName: "soldThrough" }),
  sessions: many(sessions),
  photos: many(photos),
  // the operator submission (if any) this program was made from
  submissions: many(submissions),
}));
export const sessionsRelations = relations(sessions, ({ one }) => ({
  program: one(programs, { fields: [sessions.programId], references: [programs.id] }),
}));
export const photosRelations = relations(photos, ({ one }) => ({
  program: one(programs, { fields: [photos.programId], references: [programs.id] }),
  venue: one(venues, { fields: [photos.venueId], references: [venues.id] }),
}));

// "List your program" (src/app/list-your-program). `data` is the program in retreat_schema shape
// (src/lib/submission.ts toRetreat); `photos` are the uploads in Vercel Blob, in order. Every
// submission waits as `pending` until someone reviews it; approving one makes a draft program.
// The submitter's name and email are kept to reply to them; no IPs or user agents.
export const SUBMISSION_STATUSES = ["pending", "approved", "rejected"] as const;
export type SubmissionPhoto = { url: string; pathname: string; width: number; height: number };

export const submissions = pgTable(
  "submissions",
  {
    id: uuid().primaryKey().defaultRandom(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    status: text().$type<(typeof SUBMISSION_STATUSES)[number]>().notNull().default("pending"),
    submitterName: text().notNull(),
    submitterEmail: text().notNull(),
    data: jsonb().$type<import("@/lib/submission").RetreatData>().notNull(),
    photos: jsonb().$type<SubmissionPhoto[]>().notNull().default([]),
    reviewedAt: timestamp({ withTimezone: true }),
    reviewNote: text(),
    // the draft program an approved submission became
    programId: uuid().references(() => programs.id, { onDelete: "set null" }),
  },
  (t) => [
    check("submissions_status_check", sql`${t.status} in (${list(SUBMISSION_STATUSES)})`),
    index("submissions_status_created_idx").on(t.status, t.createdAt),
  ],
);

export const submissionsRelations = relations(submissions, ({ one }) => ({
  program: one(programs, { fields: [submissions.programId], references: [programs.id] }),
}));

// One row per visitor hand-off through /go. No IPs or user agents: enough to count leads per
// program, date and organizer, and to see where they came from, without tracking people.
// `program` is the slug as text, not a foreign key, so a click survives a program being renamed or removed.
export const clicks = pgTable(
  "clicks",
  {
    id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    program: text().notNull(),
    sessionDate: date(),
    organizer: text().notNull(),
    // the page on Court Trips the click came from, or the other site's host when it came from elsewhere
    fromPath: text(),
    referrerHost: text(),
    country: text(),
    target: text().notNull(),
  },
  (t) => [index("clicks_at_idx").on(t.at), index("clicks_program_at_idx").on(t.program, t.at)],
);
