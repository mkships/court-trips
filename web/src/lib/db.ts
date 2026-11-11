import "server-only";
import { and, asc, eq, gte, inArray, sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db as maybeDb } from "@/db";
import { organizations, photos, programs, ratings, sessions, venues } from "@/db/schema";
import { photoUrl } from "@/lib/photos";
import { SPORTS, type Listing, type Operator, type ProgramDetail, type Rating, type Sport, type SportStats, type Venue } from "@/lib/sports";

// Listings, read from Postgres. Import only from server components and route handlers.
// Results are cached for an hour (tag "listings"): the site reads the database at most once an hour
// per query, and past dates drop off within the hour. Call revalidateTag("listings") after an edit.

const CACHE = { revalidate: 3600, tags: ["listings"] };

function database() {
  if (!maybeDb) {
    throw new Error("DATABASE_URL is not set, so there are no listings to show. Run `npx neon checkout dev` in web/.");
  }
  return maybeDb;
}

// What the public site shows: published and reviewed. Drafts, past programs and anything still
// flagged needs_review stay out.
const programIsPublic = and(inArray(programs.status, ["active", "sold_out"]), eq(programs.needsReview, false));
const venueIsPublic = and(eq(venues.status, "active"), eq(venues.needsReview, false));
// Only dates that haven't started yet are bookable.
const upcoming = gte(sessions.startDate, sql`current_date`);

const placeOf = (r: { cityRegion: string | null; country: string }) => r.cityRegion || r.country;
const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

// A record's photo paths in display order, resolved to where photos are served from.
const photoPaths = (owner: typeof photos.programId | typeof photos.venueId, id: typeof programs.id | typeof venues.id) =>
  sql<string[]>`array(select ${photos.path} from ${photos} where ${owner} = ${id} order by ${photos.position})`;

// One tile per upcoming session, each with its own price and availability; a program with no upcoming
// dates (seasonal, on request) gets one undated tile. Soonest first, undated last.
async function queryTiles(): Promise<Listing[]> {
  const rows = await database()
    .select({
      slug: programs.slug,
      sports: programs.sports,
      category: programs.category,
      level: programs.level,
      title: programs.title,
      organizer: programs.organizer,
      cityRegion: programs.cityRegion,
      country: programs.country,
      venueSlug: venues.slug,
      start: sessions.startDate,
      end: sessions.endDate,
      status: sessions.status,
      scheduleNotes: programs.scheduleNotes,
      priceFrom: sql<string | null>`coalesce(${sessions.priceOverride}, ${programs.priceMin})`,
      currency: programs.currency,
      priceUnit: programs.priceUnit,
      photos: photoPaths(photos.programId, programs.id),
      featuredRank: programs.featuredRank,
      bookingUrl: programs.bookingUrl,
    })
    .from(programs)
    .leftJoin(venues, and(eq(venues.id, programs.venueId), venueIsPublic))
    .leftJoin(sessions, and(eq(sessions.programId, programs.id), upcoming))
    .where(programIsPublic)
    .orderBy(sql`${sessions.startDate} asc nulls last`, asc(programs.slug));

  return rows.map((r) => ({
    key: `${r.slug}@${r.start ?? "tbd"}`,
    programSlug: r.slug,
    sports: r.sports,
    category: r.category,
    level: r.level as Listing["level"],
    title: r.title,
    organizer: r.organizer,
    place: placeOf(r),
    country: r.country,
    venueSlug: r.venueSlug,
    start: r.start,
    end: r.end,
    status: r.status,
    scheduleNotes: r.scheduleNotes,
    // raw SQL expressions come back as text
    priceFrom: r.priceFrom == null ? null : Number(r.priceFrom),
    currency: r.currency,
    priceUnit: r.priceUnit,
    photos: r.photos.map(photoUrl),
    featuredRank: r.featuredRank,
    bookingUrl: r.bookingUrl,
  }));
}

const ratingOf = (r: typeof ratings.$inferSelect): Rating => ({
  source: r.source,
  rating: r.rating,
  reviewCount: r.reviewCount,
  url: r.url,
  checkedAt: r.checkedAt,
});

async function queryVenues(slug?: string): Promise<Venue[]> {
  const rows = await database().query.venues.findMany({
    where: slug ? and(venueIsPublic, eq(venues.slug, slug)) : venueIsPublic,
    orderBy: asc(venues.slug),
    with: {
      courts: { orderBy: (c, { asc }) => asc(c.position) },
      photos: { orderBy: (p, { asc }) => asc(p.position) },
      ratings: { orderBy: (r, { asc }) => asc(r.source) },
      programs: { columns: { slug: true }, where: programIsPublic, orderBy: (p, { asc }) => asc(p.slug) },
    },
  });
  return rows.map((v) => ({
    slug: v.slug,
    name: v.name,
    kind: v.kind,
    sports: v.sports,
    place: placeOf(v),
    country: v.country,
    courts: v.courts.map((c) => ({ sport: c.sport, count: c.count, surface: c.surface, indoor: c.indoor })),
    programSlugs: v.programs.map((p) => p.slug),
    photos: v.photos.map((p) => photoUrl(p.path)),
    website: v.website ?? "",
    description: v.description,
    stars: v.stars,
    adultsOnly: v.adultsOnly,
    amenities: v.amenities,
    priceNotes: v.priceNotes,
    ratings: v.ratings.map(ratingOf),
  }));
}

async function queryProgram(slug: string): Promise<ProgramDetail | null> {
  const p = await database().query.programs.findFirst({
    where: and(programIsPublic, eq(programs.slug, slug)),
    with: {
      venue: { columns: { slug: true, status: true, needsReview: true } },
      operator: { columns: { slug: true, kind: true, status: true }, with: { ratings: { orderBy: (r, { asc }) => asc(r.source) } } },
      soldThrough: { columns: { name: true } },
      sessions: { where: upcoming, orderBy: (s, { asc }) => asc(s.startDate) },
      photos: { orderBy: (ph, { asc }) => asc(ph.position) },
    },
  });
  if (!p) return null;
  const venueShown = p.venue && p.venue.status === "active" && !p.venue.needsReview;
  return {
    slug: p.slug,
    title: p.title,
    organizer: p.organizer,
    // a public listing makes its operator's page public too
    operatorSlug: p.operator?.kind === "operator" && p.operator.status === "active" ? p.operator.slug : null,
    operatorRatings: p.operator?.kind === "operator" && p.operator.status === "active" ? p.operator.ratings.map(ratingOf) : [],
    soldThrough: p.soldThrough?.name ?? null,
    description: p.description ?? "",
    coaches: p.coaches,
    languages: p.languages,
    sports: p.sports,
    category: p.category,
    level: p.level as ProgramDetail["level"],
    theme: p.theme,
    gender: p.gender,
    ratings: p.ratings,
    place: placeOf(p),
    country: p.country,
    venueName: p.venueName,
    venueSlug: venueShown ? p.venue!.slug : null,
    sessions: p.sessions.map((s) => ({
      start: s.startDate,
      end: s.endDate,
      status: s.status,
      price: s.priceOverride ?? p.priceMin,
      bookingUrl: s.bookingUrl,
    })),
    scheduleNotes: p.scheduleNotes,
    priceMin: p.priceMin,
    priceMax: p.priceMax,
    currency: p.currency,
    priceUnit: p.priceUnit,
    priceNotes: p.priceNotes,
    inclusions: p.inclusions,
    surfaces: p.courtSurfaces,
    coachingHours: p.coachingHoursTotal,
    ratio: p.playerToCoachRatio,
    capacity: p.capacity,
    accommodation: p.accommodationType,
    photos: p.photos.map((ph) => photoUrl(ph.path)),
    bookingUrl: p.bookingUrl,
    sourceUrl: p.sourceUrl ?? p.bookingUrl,
    checkedAt: day(p.lastSeenAt ?? p.scrapedAt),
  };
}

// What the hero and search bar offer per sport: countries and months that still have a session.
function statsFor(tiles: Listing[]): Record<Sport, SportStats> {
  return Object.fromEntries(
    SPORTS.map((sport) => {
      const mine = tiles.filter((t) => t.sports.includes(sport));
      return [
        sport,
        {
          programs: new Set(mine.map((t) => t.programSlug)).size,
          tiles: mine.length,
          countries: [...new Set(mine.map((t) => t.country).filter((c): c is string => !!c))].sort(),
          months: [...new Set(mine.flatMap((t) => (t.start ? [t.start.slice(0, 7)] : [])))].sort(),
        },
      ];
    }),
  ) as Record<Sport, SportStats>;
}

export const getHomeData = unstable_cache(
  async () => {
    const [listings, allVenues] = await Promise.all([queryTiles(), queryVenues()]);
    return { stats: statsFor(listings), listings, venues: allVenues };
  },
  ["home-data"],
  CACHE,
);

export const getProgram = unstable_cache(queryProgram, ["program"], CACHE);

export const getVenue = unstable_cache(async (slug: string) => (await queryVenues(slug))[0] ?? null, ["venue"], CACHE);

export const programSlugs = unstable_cache(
  async () => (await database().select({ slug: programs.slug }).from(programs).where(programIsPublic)).map((r) => r.slug),
  ["program-slugs"],
  CACHE,
);

// Operators with at least one public listing: rated ones first, then the most listings. Their pages show those
// listings' tiles (getHomeData), so an operator page never shows anything the rest of the site doesn't.
async function queryOperators(slug?: string): Promise<Operator[]> {
  const rows = await database()
    .select({
      slug: organizations.slug,
      name: organizations.name,
      description: organizations.description,
      website: organizations.website,
      programSlugs: sql<string[]>`array(
        select p.slug from ${programs} p
        where p.operator_id = ${organizations}.id and p.status in ('active', 'sold_out') and not p.needs_review
        order by p.slug)`,
      ratings: sql<Rating[]>`coalesce((
        select json_agg(json_build_object('source', r.source, 'rating', r.rating, 'reviewCount', r.review_count, 'url', r.url, 'checkedAt', r.checked_at) order by r.source)
        from ${ratings} r where r.organization_id = ${organizations}.id), '[]'::json)`,
    })
    .from(organizations)
    .where(and(eq(organizations.kind, "operator"), eq(organizations.status, "active"), slug ? eq(organizations.slug, slug) : undefined));
  return rows
    .filter((o) => o.programSlugs.length > 0)
    // rated operators lead (best first), then whoever runs the most trips
    .sort((a, b) => best(b) - best(a) || b.programSlugs.length - a.programSlugs.length || a.name.localeCompare(b.name));
}

// an operator's highest public rating, or 0 when it has none
const best = (o: Operator) => Math.max(0, ...o.ratings.map((r) => r.rating));

export const getOperators = unstable_cache(() => queryOperators(), ["operators"], CACHE);

export const getOperator = unstable_cache(async (slug: string) => (await queryOperators(slug))[0] ?? null, ["operator"], CACHE);
