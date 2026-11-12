import "server-only";
import { and, asc, desc, eq, ilike, inArray, isNotNull, isNull, ne, or, sql } from "drizzle-orm";
import { db as maybeDb } from "@/db";
import { photos, programs, sessions, submissions, venues } from "@/db/schema";
import { programChecks, venueChecks } from "@/lib/admin/checks";

// Reads for the admin area. Uncached and unfiltered, unlike src/lib/db.ts: the admin sees drafts,
// archived listings and every date, past ones included.

export function adminDb() {
  if (!maybeDb) throw new Error("DATABASE_URL is not set. Run `npx neon checkout dev` in web/.");
  return maybeDb;
}

// "live" is what the public site shows; "review" is the queue; "archived" is out of both.
export type ListingState = "live" | "review" | "archived";
export function programState(p: { status: string; needsReview: boolean }): ListingState {
  if (p.status === "archived") return "archived";
  return (p.status === "active" || p.status === "sold_out") && !p.needsReview ? "live" : "review";
}
export function venueState(v: { status: string; needsReview: boolean }): ListingState {
  if (v.status === "archived" || v.status === "closed") return "archived";
  return v.status === "active" && !v.needsReview ? "live" : "review";
}

const inReview = (t: typeof programs | typeof venues) =>
  and(ne(t.status, "archived"), or(eq(t.needsReview, true), eq(t.status, "draft")));

// a harvest found something on a listing that needs a person (src/db/schema.ts PendingChanges)
const hasChanges = and(isNotNull(programs.pendingChanges), ne(programs.status, "archived"));

export async function queueCounts() {
  const d = adminDb();
  const [[s], [p], [v], [c]] = await Promise.all([
    d.select({ n: sql<number>`count(*)::int` }).from(submissions).where(eq(submissions.status, "pending")),
    d.select({ n: sql<number>`count(*)::int` }).from(programs).where(and(inReview(programs), isNull(programs.pendingChanges))),
    d.select({ n: sql<number>`count(*)::int` }).from(venues).where(and(inReview(venues), ne(venues.status, "closed"))),
    d.select({ n: sql<number>`count(*)::int` }).from(programs).where(hasChanges),
  ]);
  return { submissions: s.n, programs: p.n, venues: v.n, changes: c.n, total: s.n + p.n + v.n + c.n };
}

export async function pendingSubmissions() {
  return adminDb().query.submissions.findMany({ where: eq(submissions.status, "pending"), orderBy: asc(submissions.createdAt) });
}

export async function recentlyReviewedSubmissions(limit = 10) {
  return adminDb().query.submissions.findMany({
    where: ne(submissions.status, "pending"),
    orderBy: desc(submissions.reviewedAt),
    limit,
    with: { program: { columns: { slug: true, title: true } } },
  });
}

export async function submission(id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  return (
    (await adminDb().query.submissions.findFirst({
      where: eq(submissions.id, id),
      with: { program: { columns: { slug: true, title: true } } },
    })) ?? null
  );
}

// Programs with everything the editor and the checks need.
function findPrograms(where?: ReturnType<typeof and>) {
  return adminDb().query.programs.findMany({
    where,
    orderBy: [desc(programs.updatedAt)],
    with: {
      sessions: { orderBy: [asc(sessions.startDate)] },
      photos: { orderBy: [asc(photos.position)] },
      venue: { columns: { slug: true, name: true } },
      submissions: { columns: { id: true } },
      operator: { columns: { slug: true, name: true } },
      soldThrough: { columns: { slug: true, name: true } },
    },
  });
}

type ProgramRow = Awaited<ReturnType<typeof findPrograms>>[number];
const withChecks = (p: ProgramRow) => ({ ...p, checks: programChecks({ ...p, photoCount: p.photos.length }), state: programState(p) });

export async function program(slug: string) {
  const [p] = await findPrograms(eq(programs.slug, slug));
  return p ? withChecks(p) : null;
}

export async function programsWithChanges() {
  return (await findPrograms(hasChanges)).map(withChecks);
}

export type ProgramFilter = { state?: ListingState; q?: string };

export async function programList(filter: ProgramFilter = {}) {
  const where = [];
  if (filter.state === "archived") where.push(eq(programs.status, "archived"));
  if (filter.state === "review") where.push(inReview(programs));
  if (filter.state === "live") where.push(and(inArray(programs.status, ["active", "sold_out"]), eq(programs.needsReview, false)));
  if (filter.q)
    where.push(or(ilike(programs.title, `%${filter.q}%`), ilike(programs.organizer, `%${filter.q}%`), ilike(programs.slug, `%${filter.q}%`)));
  return (await findPrograms(where.length ? and(...where) : undefined)).map(withChecks);
}

export async function venue(slug: string) {
  const v = await adminDb().query.venues.findFirst({
    where: eq(venues.slug, slug),
    with: {
      courts: { orderBy: (c, { asc }) => asc(c.position) },
      photos: { orderBy: (ph, { asc }) => asc(ph.position) },
      ratings: { orderBy: (r, { asc }) => asc(r.source) },
      programs: { columns: { slug: true, title: true, status: true, needsReview: true } },
    },
  });
  return v ? { ...v, checks: venueChecks(v), state: venueState(v) } : null;
}

export async function venueList(state?: ListingState) {
  const rows = await adminDb().query.venues.findMany({
    orderBy: [desc(venues.updatedAt)],
    with: { photos: { columns: { id: true } }, programs: { columns: { id: true } } },
  });
  return rows
    .map((v) => ({ ...v, checks: venueChecks(v), state: venueState(v) }))
    .filter((v) => !state || v.state === state);
}

// For the editor's venue picker.
export async function venueOptions() {
  return adminDb().select({ id: venues.id, name: venues.name, country: venues.country }).from(venues).orderBy(asc(venues.name));
}
