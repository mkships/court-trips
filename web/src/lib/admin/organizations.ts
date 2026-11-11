import "server-only";
import { and, asc, eq, ilike, ne, or, sql, type SQL } from "drizzle-orm";
import { ORGANIZATION_KINDS, ORGANIZATION_STATUSES, organizations, programs } from "@/db/schema";
import { slugify } from "@/lib/admin/forms";
import { adminDb } from "@/lib/admin/queries";

// Operators and marketplaces (src/db/schema.ts organizations), for the admin.

export type OrganizationKind = (typeof ORGANIZATION_KINDS)[number];
export type OrganizationStatus = (typeof ORGANIZATION_STATUSES)[number];

// a name matches an organisation's name or one of its aliases, ignoring case
const named = (name: string) =>
  or(sql`lower(${organizations.name}) = lower(${name})`, sql`exists (select 1 from unnest(${organizations.aliases}) a where lower(a) = lower(${name}))`);

// The organisation a listing names, created when it's new, and its name as listings show it: the
// organisation's own spelling, whether the match was by name or alias ("active away" and "Active
// Away Ltd" both find "Active Away"). A lead that gets a listing becomes active.
export async function resolveOrganization(name: string, kind: OrganizationKind = "operator"): Promise<{ id: string; name: string } | null> {
  const n = name.trim();
  if (!n) return null;
  const d = adminDb();
  const find = async () =>
    (
      await d
        .select({ id: organizations.id, name: organizations.name, status: organizations.status })
        .from(organizations)
        .where(named(n))
        .orderBy(sql`lower(${organizations.name}) = lower(${n}) desc`)
        .limit(1)
    )[0];
  const found = await find();
  if (found) {
    if (found.status === "lead") await d.update(organizations).set({ status: "active", updatedAt: new Date() }).where(eq(organizations.id, found.id));
    return { id: found.id, name: found.name };
  }
  const base = slugify(n) || kind;
  for (let i = 1; i < 50; i++) {
    const [row] = await d
      .insert(organizations)
      .values({ slug: i === 1 ? base : `${base}-${i}`, name: n, kind })
      .onConflictDoNothing()
      .returning({ id: organizations.id });
    if (row) return { id: row.id, name: n };
    // someone else added the same name meanwhile
    const again = await find();
    if (again) return { id: again.id, name: again.name };
  }
  return null;
}

export async function uniqueOrganizationSlug(base: string, exceptId?: string) {
  const d = adminDb();
  const root = base || "operator";
  for (let n = 1; ; n++) {
    const slug = n === 1 ? root : `${root}-${n}`;
    const [taken] = await d
      .select({ id: organizations.id })
      .from(organizations)
      .where(exceptId ? and(eq(organizations.slug, slug), ne(organizations.id, exceptId)) : eq(organizations.slug, slug))
      .limit(1);
    if (!taken) return slug;
  }
}

// what /admin/operators lists: one tab per kind of record
export const ORGANIZATION_TABS = {
  operators: { label: "Operators", where: and(eq(organizations.kind, "operator"), eq(organizations.status, "active")) },
  leads: { label: "Leads", where: eq(organizations.status, "lead") },
  marketplaces: { label: "Marketplaces & directories", where: and(eq(organizations.kind, "marketplace"), ne(organizations.status, "archived")) },
  archived: { label: "Archived", where: eq(organizations.status, "archived") },
} as const;
export type OrganizationTab = keyof typeof ORGANIZATION_TABS;

const LIVE = sql`p.status in ('active', 'sold_out') and not p.needs_review`;

export async function organizationList(tab: OrganizationTab, q?: string) {
  const where: SQL[] = [ORGANIZATION_TABS[tab].where as SQL];
  if (q) where.push(or(ilike(organizations.name, `%${q}%`), ilike(organizations.slug, `%${q}%`), sql`array_to_string(${organizations.aliases}, ' ') ilike ${`%${q}%`}`) as SQL);
  return adminDb()
    .select({
      id: organizations.id,
      slug: organizations.slug,
      name: organizations.name,
      kind: organizations.kind,
      status: organizations.status,
      website: organizations.website,
      country: organizations.country,
      sports: organizations.sports,
      note: organizations.note,
      updatedAt: organizations.updatedAt,
      listings: sql<number>`(select count(*)::int from ${programs} p where p.operator_id = ${organizations}.id and p.status <> 'archived')`,
      live: sql<number>`(select count(*)::int from ${programs} p where p.operator_id = ${organizations}.id and ${LIVE})`,
      sold: sql<number>`(select count(*)::int from ${programs} p where p.sold_through_id = ${organizations}.id and p.status <> 'archived')`,
      seenOn: sql<string | null>`(select m.name from ${organizations} m where m.id = ${organizations}.seen_on_id)`,
    })
    .from(organizations)
    .where(and(...where))
    .orderBy(asc(sql`lower(${organizations.name})`));
}

export async function organizationTabCounts() {
  const [row] = await adminDb()
    .select({
      operators: sql<number>`count(*) filter (where ${ORGANIZATION_TABS.operators.where})::int`,
      leads: sql<number>`count(*) filter (where ${ORGANIZATION_TABS.leads.where})::int`,
      marketplaces: sql<number>`count(*) filter (where ${ORGANIZATION_TABS.marketplaces.where})::int`,
      archived: sql<number>`count(*) filter (where ${ORGANIZATION_TABS.archived.where})::int`,
    })
    .from(organizations);
  return row as Record<OrganizationTab, number>;
}

export async function organization(slug: string) {
  return (
    (await adminDb().query.organizations.findFirst({
      where: eq(organizations.slug, slug),
      with: {
        programs: { columns: { slug: true, title: true, status: true, needsReview: true }, orderBy: (p, { asc }) => asc(p.title) },
        sold: { columns: { slug: true, title: true, status: true, needsReview: true }, orderBy: (p, { asc }) => asc(p.title) },
        seenOn: { columns: { slug: true, name: true } },
        ratings: { orderBy: (r, { asc }) => asc(r.source) },
      },
    })) ?? null
  );
}

// For pickers: the program editor's operator suggestions and marketplace list, the merge and "seen on" menus.
export async function organizationOptions() {
  return adminDb()
    .select({ id: organizations.id, name: organizations.name, kind: organizations.kind, status: organizations.status })
    .from(organizations)
    .where(ne(organizations.status, "archived"))
    .orderBy(asc(sql`lower(${organizations.name})`));
}
