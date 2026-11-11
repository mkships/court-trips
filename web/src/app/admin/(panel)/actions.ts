"use server";

import { del } from "@vercel/blob";
import { and, asc, eq, inArray, ne, sql } from "drizzle-orm";
import { revalidatePath, revalidateTag } from "next/cache";
import path from "node:path";
import { redirect } from "next/navigation";
import { organizations, photos, programs, sessions, submissions, venues } from "@/db/schema";
import { requireAdmin } from "@/lib/admin/auth";
import { hasErrors, programChecks, venueChecks } from "@/lib/admin/checks";
import { type OrganizationForm, organizationFormSchema, organizationFormToObject, programFormSchema, programFormToObject, slugify, venueFormSchema, venueFormToObject } from "@/lib/admin/forms";
import { resolveOrganization, uniqueOrganizationSlug } from "@/lib/admin/organizations";
import { adminDb, programState, venueState } from "@/lib/admin/queries";
import { fetchPhoto, storePhoto } from "@/lib/photo-store.mjs";
import { fieldErrors, type FieldErrors } from "@/lib/submission";

export type SaveResult = { ok: boolean; message: string; errors?: FieldErrors } | null;
type Intent = "save" | "publish" | "unpublish" | "archive" | "restore";

const INTENTS: Intent[] = ["save", "publish", "unpublish", "archive", "restore"];
const intentOf = (form: FormData): Intent => {
  const value = String(form.get("intent") ?? "save") as Intent;
  return INTENTS.includes(value) ? value : "save";
};

// What each button does to a listing's visibility. Publishing is the only way onto the public site.
const LIFECYCLE = {
  save: null,
  publish: { status: "active", needsReview: false },
  unpublish: { status: "draft", needsReview: true },
  archive: { status: "archived", needsReview: true },
  restore: { status: "draft", needsReview: true },
} as const;

const DONE: Record<Intent, string> = {
  save: "Saved.",
  publish: "Published: it's live on the site now.",
  unpublish: "Unpublished: it's back in the review queue.",
  archive: "Archived: hidden, out of the queue, and skipped by future harvests.",
  restore: "Restored to the review queue.",
};

// Public pages read through an hour-long cache; an admin change should show straight away.
function refreshSite() {
  revalidateTag("listings");
  revalidatePath("/", "layout");
}

async function uniqueSlug(table: typeof programs | typeof venues, base: string, exceptId?: string) {
  const d = adminDb();
  const root = base || "listing";
  for (let n = 1; ; n++) {
    const slug = n === 1 ? root : `${root}-${n}`;
    const [taken] = await d
      .select({ id: table.id })
      .from(table)
      .where(exceptId ? and(eq(table.slug, slug), ne(table.id, exceptId)) : eq(table.slug, slug))
      .limit(1);
    if (!taken) return slug;
  }
}

export async function saveProgram(id: string, _prev: SaveResult, form: FormData): Promise<SaveResult> {
  await requireAdmin();
  const d = adminDb();
  const intent = intentOf(form);
  const current = await d.query.programs.findFirst({ where: eq(programs.id, id) });
  if (!current) return { ok: false, message: "That program no longer exists." };

  const parsed = programFormSchema.safeParse(programFormToObject(form));
  if (!parsed.success) return { ok: false, message: "Some fields need another look. Nothing was saved.", errors: fieldErrors(parsed.error) };
  const v = parsed.data;

  // a live listing keeps its address, so links people have shared keep working
  if (v.slug !== current.slug) {
    if (programState(current) === "live") return { ok: false, message: "Unpublish first to change a live listing's address.", errors: { slug: "Live listings keep their address" } };
    if ((await uniqueSlug(programs, v.slug, id)) !== v.slug) return { ok: false, message: "That address is taken.", errors: { slug: "Another listing uses this address" } };
  }

  const kept = (await d.select({ id: photos.id }).from(photos).where(eq(photos.programId, id)).orderBy(asc(photos.position))).filter(
    (p) => !v.remove_photo.includes(p.id),
  );
  const photoCount = kept.length;
  const checks = programChecks({
    title: v.title,
    organizer: v.organizer,
    description: v.description,
    sports: v.racket_sport,
    category: v.category,
    level: v.level,
    country: v.country,
    bookingUrl: v.booking_url,
    scheduleNotes: v.schedule_notes,
    priceMin: v.price_min,
    priceMax: v.price_max,
    currency: v.currency,
    sessions: v.sessions.map((s) => ({ startDate: s.start, endDate: s.end, bookingUrl: s.booking_url })),
    photoCount,
  });
  const blocked = intent === "publish" && hasErrors(checks);
  const lifecycle = blocked ? null : LIFECYCLE[intent];
  // the operator is found (or added) by name; its record keeps the spelling
  const operator = await resolveOrganization(v.organizer);

  await d.batch([
    d
      .update(programs)
      .set({
        slug: v.slug,
        title: v.title,
        organizer: operator?.name ?? v.organizer,
        operatorId: operator?.id ?? null,
        soldThroughId: v.sold_through_id,
        description: v.description,
        bookingUrl: v.booking_url,
        sourceUrl: v.source_url,
        coaches: v.coaches,
        sports: v.racket_sport,
        category: v.category,
        level: v.level,
        country: v.country,
        cityRegion: v.city_region,
        venueName: v.venue_name,
        venueId: v.venue_id,
        lat: v.lat,
        lng: v.lng,
        scheduleNotes: v.schedule_notes,
        priceMin: v.price_min ?? v.price_max,
        priceMax: v.price_max ?? v.price_min,
        currency: v.currency,
        priceUnit: v.price_unit,
        priceNotes: v.price_notes,
        inclusions: v.inclusions.map((s) => s.toLowerCase()),
        courtSurfaces: v.court_surface,
        coachingHoursTotal: v.coaching_hours_total,
        playerToCoachRatio: v.player_to_coach_ratio,
        capacity: v.capacity,
        accommodationType: v.accommodation_type,
        featuredRank: v.featured_rank,
        ...(lifecycle ?? {}),
        updatedAt: new Date(),
      })
      .where(eq(programs.id, id)),
    // dates are replaced as a set, like the seed import does
    d.delete(sessions).where(eq(sessions.programId, id)),
    ...(v.sessions.length
      ? [
          d.insert(sessions).values(
            v.sessions.map((s) => ({ programId: id, startDate: s.start, endDate: s.end, status: s.status, priceOverride: s.price, bookingUrl: s.booking_url })),
          ),
        ]
      : []),
    ...(v.remove_photo.length
      ? [
          d.delete(photos).where(and(eq(photos.programId, id), inArray(photos.id, v.remove_photo))),
          ...reorderPhotos("program", id, kept.map((p) => p.id)),
        ]
      : []),
  ]);
  refreshSite();

  if (v.slug !== current.slug) redirect(`/admin/programs/${v.slug}?saved=1`);
  if (blocked) return { ok: false, message: "Saved, but not published: fix the errors at the top first." };
  return { ok: true, message: DONE[intent] };
}

// Approving a submission makes it a draft listing to finish in the editor; it isn't public yet.
export async function createDraftFromSubmission(id: string) {
  await requireAdmin();
  const d = adminDb();
  const s = await d.query.submissions.findFirst({ where: eq(submissions.id, id) });
  if (!s) redirect("/admin");
  if (s.status !== "pending") {
    const done = s.programId ? await d.query.programs.findFirst({ where: eq(programs.id, s.programId), columns: { slug: true } }) : null;
    redirect(done ? `/admin/programs/${done.slug}` : `/admin/submissions/${id}`);
  }

  const r = s.data;
  const programId = crypto.randomUUID();
  const slug = await uniqueSlug(programs, slugify(r.core_identity.title) || slugify(r.core_identity.organizer));
  const operator = await resolveOrganization(r.core_identity.organizer);
  await d.batch([
    d.insert(programs).values({
      id: programId,
      slug,
      status: "draft",
      needsReview: true,
      sourceUrl: r.core_identity.booking_url,
      title: r.core_identity.title,
      organizer: operator?.name ?? r.core_identity.organizer,
      operatorId: operator?.id ?? null,
      description: r.core_identity.description,
      coaches: r.core_identity.coaches,
      languages: r.core_identity.languages,
      bookingUrl: r.core_identity.booking_url,
      contactEmail: r.core_identity.contact_email,
      contactPhone: r.core_identity.contact_phone,
      sports: r.categorization.racket_sport,
      category: r.categorization.category,
      theme: r.categorization.theme,
      gender: r.categorization.gender,
      level: r.categorization.level,
      ratings: r.rating_systems,
      country: r.location.country,
      cityRegion: r.location.city_region,
      venueName: r.location.venue_name,
      scheduleNotes: r.schedule_notes,
      priceMin: r.pricing.price_min,
      priceMax: r.pricing.price_max,
      currency: r.pricing.currency,
      priceUnit: r.pricing.price_unit,
      priceNotes: r.pricing.price_notes,
      inclusions: r.pricing.inclusions,
      courtSurfaces: r.sport_specific.court_surface,
      coachingHoursTotal: r.sport_specific.coaching_hours_total,
      playerToCoachRatio: r.sport_specific.player_to_coach_ratio,
      capacity: r.sport_specific.capacity,
      accommodationType: r.sport_specific.accommodation_type,
    }),
    ...(r.sessions.length
      ? [
          d.insert(sessions).values(
            r.sessions.map((x) => ({ programId, startDate: x.start_date, endDate: x.end_date, status: x.status, priceOverride: x.price_override ?? null })),
          ),
        ]
      : []),
    // the uploads stay where they are in Blob; their full URLs are the photo paths
    ...(s.photos.length ? [d.insert(photos).values(s.photos.map((p, position) => ({ programId, position, path: p.url })))] : []),
    d.update(submissions).set({ status: "approved", reviewedAt: new Date(), programId }).where(eq(submissions.id, id)),
  ]);
  revalidatePath("/admin", "layout");
  redirect(`/admin/programs/${slug}?from=submission`);
}

// The harvest's column names (snake_case) that a proposal can change, as the table's field names.
const PROPOSABLE = {
  title: "title", organizer: "organizer", description: "description", booking_url: "bookingUrl", category: "category",
  sports: "sports", level: "level", country: "country", city_region: "cityRegion", venue_name: "venueName",
  schedule_notes: "scheduleNotes", currency: "currency", price_unit: "priceUnit", price_notes: "priceNotes",
  inclusions: "inclusions", court_surfaces: "courtSurfaces", coaching_hours_total: "coachingHoursTotal",
  player_to_coach_ratio: "playerToCoachRatio", capacity: "capacity", accommodation_type: "accommodationType",
  coaches: "coaches", languages: "languages", price_min: "priceMin", price_max: "priceMax",
} as const;

export async function applyPendingChanges(id: string) {
  await requireAdmin();
  const d = adminDb();
  const p = await d.query.programs.findFirst({ where: eq(programs.id, id) });
  if (!p?.pendingChanges) redirect(p ? `/admin/programs/${p.slug}` : "/admin");
  const { fields = {}, sessions: proposedDates } = p.pendingChanges;
  const set: Record<string, unknown> = {};
  for (const [column, change] of Object.entries(fields))
    if (column in PROPOSABLE) set[PROPOSABLE[column as keyof typeof PROPOSABLE]] = change.to;
  if (typeof set.organizer === "string") {
    const operator = await resolveOrganization(set.organizer);
    set.organizer = operator?.name ?? set.organizer;
    set.operatorId = operator?.id ?? null;
  }
  const today = new Date().toISOString().slice(0, 10);
  await d.batch([
    // a missing flag stays until it's dismissed or the listing archived
    d
      .update(programs)
      .set({ ...set, pendingChanges: p.pendingChanges.missing ? { foundAt: p.pendingChanges.foundAt, missing: true } : null, updatedAt: new Date() })
      .where(eq(programs.id, id)),
    ...(proposedDates
      ? [
          d.delete(sessions).where(and(eq(sessions.programId, id), sql`${sessions.startDate} >= ${today}`)),
          ...(proposedDates.to.length
            ? [
                d.insert(sessions).values(
                  proposedDates.to.map((s) => ({
                    programId: id,
                    startDate: s.start_date,
                    endDate: s.end_date,
                    status: s.status as "available" | "waitlist" | "sold_out",
                    priceOverride: s.price_override,
                    bookingUrl: s.booking_url,
                  })),
                ),
              ]
            : []),
        ]
      : []),
  ]);
  refreshSite();
  // a fresh value each time, so the editor re-reads the listing instead of keeping what's on screen
  redirect(`/admin/programs/${p.slug}?applied=${Date.now()}`);
}

export async function dismissPendingChanges(id: string) {
  await requireAdmin();
  const d = adminDb();
  const [p] = await d.update(programs).set({ pendingChanges: null, missedRuns: 0 }).where(eq(programs.id, id)).returning({ slug: programs.slug });
  revalidatePath("/admin", "layout");
  redirect(p ? `/admin/programs/${p.slug}?dismissed=${Date.now()}` : "/admin");
}

export async function rejectSubmission(id: string, form: FormData) {
  await requireAdmin();
  const d = adminDb();
  const s = await d.query.submissions.findFirst({ where: eq(submissions.id, id) });
  if (!s || s.status !== "pending") redirect(`/admin/submissions/${id}`);
  const note = String(form.get("note") ?? "").trim().slice(0, 1000) || null;
  await d.update(submissions).set({ status: "rejected", reviewedAt: new Date(), reviewNote: note }).where(eq(submissions.id, id));
  // the photos were only ever for this listing, and weren't cleared to publish
  if (s.photos.length && process.env.BLOB_READ_WRITE_TOKEN) await del(s.photos.map((p) => p.url)).catch(() => {});
  revalidatePath("/admin", "layout");
  redirect("/admin?rejected=1");
}

export async function saveVenue(id: string, _prev: SaveResult, form: FormData): Promise<SaveResult> {
  await requireAdmin();
  const d = adminDb();
  const intent = intentOf(form);
  const current = await d.query.venues.findFirst({ where: eq(venues.id, id) });
  if (!current) return { ok: false, message: "That venue no longer exists." };

  const parsed = venueFormSchema.safeParse(venueFormToObject(form));
  if (!parsed.success) return { ok: false, message: "Some fields need another look. Nothing was saved.", errors: fieldErrors(parsed.error) };
  const v = parsed.data;
  if (v.slug !== current.slug) {
    if (venueState(current) === "live") return { ok: false, message: "Unpublish first to change a live venue's address.", errors: { slug: "Live venues keep their address" } };
    if ((await uniqueSlug(venues, v.slug, id)) !== v.slug) return { ok: false, message: "That address is taken.", errors: { slug: "Another venue uses this address" } };
  }

  const blocked = intent === "publish" && hasErrors(venueChecks({ ...v, website: v.website, kind: v.kind }));
  const lifecycle = blocked ? null : LIFECYCLE[intent];
  const kept = v.remove_photo.length
    ? (await d.select({ id: photos.id }).from(photos).where(eq(photos.venueId, id)).orderBy(asc(photos.position))).filter((p) => !v.remove_photo.includes(p.id))
    : [];
  await d.batch([
    d
    .update(venues)
    .set({
      slug: v.slug,
      name: v.name,
      kind: v.kind,
      stars: v.stars,
      adultsOnly: v.adults_only,
      description: v.description,
      website: v.website,
      country: v.country,
      cityRegion: v.city_region,
      lat: v.lat,
      lng: v.lng,
      sports: v.sports,
      priceNotes: v.price_notes,
      ...(lifecycle ?? {}),
      updatedAt: new Date(),
    })
    .where(eq(venues.id, id)),
    ...(v.remove_photo.length
      ? [d.delete(photos).where(and(eq(photos.venueId, id), inArray(photos.id, v.remove_photo))), ...reorderPhotos("venue", id, kept.map((p) => p.id))]
      : []),
  ]);
  refreshSite();

  if (v.slug !== current.slug) redirect(`/admin/venues/${v.slug}?saved=1`);
  if (blocked) return { ok: false, message: "Saved, but not published: fix the errors at the top first." };
  return { ok: true, message: DONE[intent] };
}

// ---------- photos ----------

export type PhotoOwner = "program" | "venue";
export type PhotoResult = { ok: boolean; message: string };

// The gallery shows a handful; more than this is a sign something's being bulk-added by mistake.
const MAX_LISTING_PHOTOS = 12;
// What the browser sends after shrinking (src/components/admin/PhotoManager.tsx), with some slack.
const UPLOAD_MAX_BYTES = 3.5 * 1024 * 1024;

const ownerColumn = (owner: PhotoOwner) => (owner === "program" ? photos.programId : photos.venueId);

// Puts a listing's photos in the order given. Negative first, so no two share a position midway
// (position is unique per listing). Statements for a batch.
function reorderPhotos(owner: PhotoOwner, id: string, order: number[]) {
  const d = adminDb();
  return [
    d.update(photos).set({ position: sql`-${photos.position} - 1` }).where(eq(ownerColumn(owner), id)),
    ...order.map((photoId, position) => d.update(photos).set({ position }).where(and(eq(photos.id, photoId), eq(ownerColumn(owner), id)))),
  ];
}

async function listingSlug(owner: PhotoOwner, id: string) {
  const d = adminDb();
  const [row] =
    owner === "program"
      ? await d.select({ slug: programs.slug }).from(programs).where(eq(programs.id, id)).limit(1)
      : await d.select({ slug: venues.slug }).from(venues).where(eq(venues.id, id)).limit(1);
  return row?.slug ?? null;
}

// Adds one photo to the end of a listing's photos, from an upload ("file") or another site's
// address ("url"). One per call keeps each request small; the editor sends them in turn.
// It's stored and sized exactly as the harvest import does (src/lib/photo-store.mjs).
export async function addPhoto(owner: PhotoOwner, id: string, form: FormData): Promise<PhotoResult> {
  await requireAdmin();
  const d = adminDb();
  const slug = await listingSlug(owner, id);
  if (!slug) return { ok: false, message: "That listing no longer exists." };
  const existing = await d.select({ position: photos.position }).from(photos).where(eq(ownerColumn(owner), id));
  if (existing.length >= MAX_LISTING_PHOTOS) return { ok: false, message: `A listing holds up to ${MAX_LISTING_PHOTOS} photos. Remove one first.` };

  const file = form.get("file");
  const url = String(form.get("url") ?? "").trim();
  let input: Buffer;
  let sourceUrl: string | null = null;
  try {
    if (file instanceof File && file.size > 0) {
      if (file.size > UPLOAD_MAX_BYTES) return { ok: false, message: "That file is too large." };
      input = Buffer.from(await file.arrayBuffer());
    } else if (url) {
      let parsed: URL;
      try {
        parsed = new URL(url);
      } catch {
        return { ok: false, message: "That isn't a web address." };
      }
      if (!/^https?:$/.test(parsed.protocol)) return { ok: false, message: "The address has to start with http:// or https://." };
      input = await fetchPhoto(parsed.href);
      sourceUrl = parsed.href;
    } else return { ok: false, message: "Pick a file or paste a photo's address." };

    const position = existing.reduce((max, p) => Math.max(max, p.position), -1) + 1;
    const stored = await storePhoto({ slug, n: position, input, localDir: path.join(process.cwd(), "public") });
    await d.insert(photos).values({ ...(owner === "program" ? { programId: id } : { venueId: id }), position, path: stored, sourceUrl });
  } catch (error) {
    return { ok: false, message: `Couldn't use it: ${error instanceof Error ? error.message : "something went wrong"}.` };
  }
  refreshSite();
  return { ok: true, message: "Added." };
}

// Moves a photo to the front: the first photo is the one cards and link previews show.
export async function makeCoverPhoto(owner: PhotoOwner, id: string, photoId: number): Promise<PhotoResult> {
  await requireAdmin();
  const d = adminDb();
  const rows = await d.select({ id: photos.id }).from(photos).where(eq(ownerColumn(owner), id)).orderBy(asc(photos.position));
  if (!rows.some((p) => p.id === photoId)) return { ok: false, message: "That photo is no longer on the listing." };
  const order = [photoId, ...rows.map((p) => p.id).filter((p) => p !== photoId)];
  const [first, ...rest] = reorderPhotos(owner, id, order);
  await d.batch([first, ...rest]);
  refreshSite();
  return { ok: true, message: "Cover changed." };
}

// ---------- operators and marketplaces ----------

function organizationValues(v: OrganizationForm) {
  return {
    slug: v.slug,
    name: v.name,
    kind: v.kind,
    status: v.status,
    website: v.website,
    description: v.description,
    country: v.country,
    sports: v.sports,
    aliases: v.aliases,
    note: v.note,
    sourceUrl: v.source_url,
    seenOnId: v.seen_on_id,
  };
}

// another organisation already has this name (names are unique, ignoring case)
async function nameTaken(name: string, exceptId?: string) {
  const [row] = await adminDb()
    .select({ slug: organizations.slug })
    .from(organizations)
    .where(exceptId ? and(sql`lower(${organizations.name}) = lower(${name})`, ne(organizations.id, exceptId)) : sql`lower(${organizations.name}) = lower(${name})`)
    .limit(1);
  return row?.slug ?? null;
}

export async function saveOrganization(id: string, _prev: SaveResult, form: FormData): Promise<SaveResult> {
  await requireAdmin();
  const d = adminDb();
  const current = await d.query.organizations.findFirst({ where: eq(organizations.id, id) });
  if (!current) return { ok: false, message: "That operator no longer exists." };
  const parsed = organizationFormSchema.safeParse(organizationFormToObject(form));
  if (!parsed.success) return { ok: false, message: "Some fields need another look. Nothing was saved.", errors: fieldErrors(parsed.error) };
  const v = parsed.data;
  if (v.seen_on_id === id) return { ok: false, message: "It can't be seen on itself.", errors: { seen_on_id: "Pick a marketplace, or none" } };
  if (await nameTaken(v.name, id)) return { ok: false, message: "Another operator has that name: merge them instead.", errors: { name: "Already taken" } };
  if (v.slug !== current.slug && (await uniqueOrganizationSlug(v.slug, id)) !== v.slug)
    return { ok: false, message: "That address is taken.", errors: { slug: "Another operator uses this address" } };

  await d.batch([
    d.update(organizations).set({ ...organizationValues(v), updatedAt: new Date() }).where(eq(organizations.id, id)),
    // listings show the operator's name: keep them in step with a rename
    ...(v.name !== current.name ? [d.update(programs).set({ organizer: v.name }).where(eq(programs.operatorId, id))] : []),
  ]);
  refreshSite();
  if (v.slug !== current.slug) redirect(`/admin/operators/${v.slug}?saved=1`);
  return { ok: true, message: "Saved." };
}

export async function createOrganization(_prev: SaveResult, form: FormData): Promise<SaveResult> {
  await requireAdmin();
  const raw = organizationFormToObject(form);
  raw.slug = String(raw.slug ?? "").trim() || slugify(String(raw.name ?? ""));
  const parsed = organizationFormSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, message: "Some fields need another look. Nothing was saved.", errors: fieldErrors(parsed.error) };
  const v = parsed.data;
  const existing = await nameTaken(v.name);
  if (existing) return { ok: false, message: `Already known: see /admin/operators/${existing}.`, errors: { name: "Already in the list" } };
  const slug = await uniqueOrganizationSlug(v.slug);
  await adminDb().insert(organizations).values({ ...organizationValues(v), slug });
  revalidatePath("/admin", "layout");
  redirect(`/admin/operators/${slug}?saved=1`);
}

// Two records for the same organisation: the listings, links and spelling of `id` move to the one
// picked, and `id` goes. The old name becomes an alias, so imports that use it link to the right one.
export async function mergeOrganization(id: string, form: FormData) {
  await requireAdmin();
  const d = adminDb();
  const targetId = String(form.get("into") ?? "");
  const [from, into] = await Promise.all([
    d.query.organizations.findFirst({ where: eq(organizations.id, id) }),
    /^[0-9a-f-]{36}$/.test(targetId) ? d.query.organizations.findFirst({ where: eq(organizations.id, targetId) }) : null,
  ]);
  if (!from) redirect("/admin/operators");
  if (!into || into.id === from.id) redirect(`/admin/operators/${from.slug}?merge=none`);
  const aliases = [...new Set([...into.aliases, from.name, ...from.aliases].filter((a) => a.toLowerCase() !== into.name.toLowerCase()))];
  await d.batch([
    d.update(programs).set({ operatorId: into.id, organizer: into.name }).where(eq(programs.operatorId, from.id)),
    d.update(programs).set({ soldThroughId: into.id }).where(eq(programs.soldThroughId, from.id)),
    d.update(organizations).set({ seenOnId: into.id }).where(eq(organizations.seenOnId, from.id)),
    d
      .update(organizations)
      .set({
        aliases,
        website: into.website ?? from.website,
        description: into.description ?? from.description,
        country: into.country ?? from.country,
        sports: [...new Set([...into.sports, ...from.sports])],
        note: [into.note, from.note].filter(Boolean).join("\n\n") || null,
        // a lead merged into a listed operator is listed; two leads stay a lead
        status: into.status === "lead" && from.status === "active" ? "active" : into.status,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, into.id)),
    d.delete(organizations).where(eq(organizations.id, from.id)),
  ]);
  refreshSite();
  redirect(`/admin/operators/${into.slug}?merged=1`);
}
