#!/usr/bin/env node
/**
 * Harvest step 3: loads the listing files /harvest wrote (harvest/out/*.json) into Postgres.
 *
 *   npm run harvest:import                 import, then archive the files to harvest/.cache/imported/
 *   npm run harvest:import -- --dry-run    say what would happen, change nothing
 *   npm run harvest:import -- --email      also email the summary (RESEND_API_KEY, SUBMISSIONS_NOTIFY_TO)
 *
 * What happens to each program:
 * - new: a hidden draft (status draft, needs_review), with its photos uploaded to Blob.
 * - already a draft nobody has edited: replaced by the new reading.
 * - live, or edited by hand: safe changes are applied straight away: new dates, a date's
 *   availability, a date's own booking link, and prices that moved less than 25%. Everything else
 *   (a new title, a removed date, a big price change) is saved as pending_changes for a person to
 *   apply or dismiss in /admin.
 * - archived: skipped.
 * Programs a source page no longer shows get missed_runs + 1; at 2, they're flagged in /admin.
 * Each program is linked to its operator (organizations, by name or alias; a new name becomes a new
 * operator) and, when core_identity.sold_through names one, the marketplace it's sold through. The
 * report's leads are saved as organizations with status lead, for /admin → Operators → Leads.
 * Pages are only marked as seen (harvest/state.json) once their results are in.
 */
import { neon } from "@neondatabase/serverless";
import { randomUUID } from "node:crypto";
import { mkdir, readdir, rename } from "node:fs/promises";
import path from "node:path";
import { fetchPhoto, storePhoto } from "../../src/lib/photo-store.mjs";
import { CACHE, OUT, readJson, REPORT, RUN, STATE, writeJson } from "./lib.mjs";
import { today, validate, validateVenue } from "./validate.mjs";

const WEB = path.dirname(path.dirname(path.dirname(new URL(import.meta.url).pathname)));
const dryRun = process.argv.includes("--dry-run");
const email = process.argv.includes("--email");
// HARVEST_DATABASE_URL: the database the harvest updates (production's), kept apart from the
// DATABASE_URL local development uses (the Neon dev branch)
const url = process.env.HARVEST_DATABASE_URL || process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) {
  console.error("No database: set HARVEST_DATABASE_URL (production's, for the live site) or DATABASE_URL in web/.env.local.");
  process.exit(1);
}
const sql = neon(url);
const now = new Date().toISOString();
const PRICE_TOLERANCE = 0.25;
const MISSED_RUNS_TO_FLAG = 2;

// ---------- photos: stored by src/lib/photo-store.mjs, the same as /admin's "Add photos" ----------
async function storePhotos(slug, images) {
  const paths = [];
  for (const [n, src] of images.entries()) {
    try {
      const stored = await storePhoto({ slug, n, input: await fetchPhoto(src), localDir: path.join(WEB, "public") });
      paths.push({ path: stored, source: src });
    } catch (error) {
      summary.photoProblems.push(`${slug}: ${src.slice(0, 80)}… ${error.message}`);
    }
  }
  return paths;
}

// ---------- comparing a new reading with what's in the database ----------
const FIELDS = {
  title: "title", organizer: "organizer", description: "description", booking_url: "booking_url", category: "category",
  sports: "sports", level: "level", country: "country", city_region: "city_region", venue_name: "venue_name",
  schedule_notes: "schedule_notes", currency: "currency", price_unit: "price_unit", price_notes: "price_notes",
  inclusions: "inclusions", court_surfaces: "court_surfaces", coaching_hours_total: "coaching_hours_total",
  player_to_coach_ratio: "player_to_coach_ratio", capacity: "capacity", accommodation_type: "accommodation_type",
  coaches: "coaches", languages: "languages", price_min: "price_min", price_max: "price_max",
};
const NUMERIC = new Set(["price_min", "price_max", "coaching_hours_total"]);
// filled only when empty: a person's value always wins
const FILL_ONLY = ["lat", "lng", "contact_email", "contact_phone", "theme", "gender", "ratings", "data_quality_score"];

const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
const near = (a, b) => a != null && b != null && b > 0 && Math.abs(a - b) / b <= PRICE_TOLERANCE;

function sessionsDiff(existing, next) {
  const upcoming = existing.filter((s) => s.start_date >= today());
  const byStart = new Map(upcoming.map((s) => [s.start_date, s]));
  const nextStarts = new Set(next.map((s) => s.start_date));
  const removed = upcoming.filter((s) => !nextStarts.has(s.start_date));
  let safe = removed.length === 0;
  let changed = removed.length > 0;
  for (const s of next) {
    const old = byStart.get(s.start_date);
    if (!old) {
      changed = true; // a new date: safe
      continue;
    }
    if (old.end_date !== s.end_date) {
      changed = true;
      safe = false;
    }
    if (old.status !== s.status || old.booking_url !== s.booking_url) changed = true;
    if (!same(old.price_override, s.price_override)) {
      changed = true;
      if (!(old.price_override == null || near(s.price_override, old.price_override))) safe = false;
    }
  }
  return { changed, safe, upcoming };
}

// ---------- operators and marketplaces (organizations) ----------
// same as slugify in src/lib/admin/forms.ts
const slugify = (s) =>
  s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
const findOrganization = async (name) =>
  (
    await sql`select id, name, status from organizations
      where lower(name) = lower(${name}) or exists (select 1 from unnest(aliases) a where lower(a) = lower(${name}))
      order by (lower(name) = lower(${name})) desc limit 1`
  )[0];

// a new row with a free slug; another row may take the name or slug first, so look again after a clash
async function createOrganization(values) {
  const base = slugify(values.name) || values.kind || "operator";
  for (let n = 1; n < 50; n++) {
    const slug = n === 1 ? base : `${base}-${n}`;
    const [row] = await sql`insert into organizations (slug, name, kind, status, note, source_url, seen_on_id)
      values (${slug}, ${values.name}, ${values.kind ?? "operator"}, ${values.status ?? "active"}, ${values.note ?? null},
        ${values.sourceUrl ?? null}, ${values.seenOnId ?? null})
      on conflict do nothing returning id`;
    if (row) return row.id;
    const found = await findOrganization(values.name);
    if (found) return found.id;
  }
  throw new Error(`no free slug for organization ${values.name}`);
}

// The operator (or marketplace) a listing names, created when it's new, and the name listings show:
// the organisation's own spelling, so "Active Away Ltd" (an alias) reads "Active Away" and isn't
// proposed as a change every run. A lead that now has a listing becomes active.
const organizationIds = new Map();
async function organization(name, kind = "operator") {
  const n = name?.trim();
  if (!n) return { id: null, name: n };
  if (organizationIds.has(n.toLowerCase())) return organizationIds.get(n.toLowerCase());
  const found = await findOrganization(n);
  let result = { id: found?.id ?? null, name: found?.name ?? n };
  if (found?.status === "lead") {
    summary.leadsListed.push(found.name);
    if (!dryRun) await sql`update organizations set status = 'active', updated_at = now() where id = ${found.id}`;
  }
  if (!found) {
    summary.newOrganizations.push(kind === "marketplace" ? `${n} (marketplace)` : n);
    if (!dryRun) result = { id: await createOrganization({ name: n, kind }), name: n };
  }
  organizationIds.set(n.toLowerCase(), result);
  return result;
}

// ---------- writing ----------
const COLUMNS = [
  "title", "organizer", "description", "coaches", "languages", "booking_url", "contact_email", "contact_phone", "sports", "category",
  "theme", "gender", "level", "ratings", "country", "city_region", "venue_name", "lat", "lng", "schedule_notes", "price_min",
  "price_max", "currency", "price_unit", "price_notes", "inclusions", "court_surfaces", "coaching_hours_total",
  "player_to_coach_ratio", "capacity", "accommodation_type", "data_quality_score",
];
const JSONB = new Set(["ratings", "inclusions"]);
const param = (col, value) => (JSONB.has(col) ? JSON.stringify(value ?? (col === "ratings" ? {} : [])) : value);

function updateQuery(id, values, extra = {}) {
  const cols = Object.keys(values);
  const sets = cols.map((c, i) => `${c} = $${i + 2}${JSONB.has(c) ? "::jsonb" : ""}`);
  const params = [id, ...cols.map((c) => param(c, values[c]))];
  for (const [c, v] of Object.entries(extra)) {
    params.push(c === "pending_changes" && v != null ? JSON.stringify(v) : v);
    sets.push(`${c} = $${params.length}${c === "pending_changes" ? "::jsonb" : ""}`);
  }
  return sql.query(`update programs set ${sets.join(", ")} where id = $1`, params);
}

const replaceUpcomingSessions = (id, list) => [
  sql.query(`delete from sessions where program_id = $1 and start_date >= current_date`, [id]),
  ...(list.length
    ? [
        sql.query(
          `insert into sessions (program_id, start_date, end_date, status, price_override, booking_url)
           select $1, x.start_date, x.end_date, x.status, x.price_override, x.booking_url
           from jsonb_to_recordset($2::jsonb) as x(start_date date, end_date date, status text, price_override numeric, booking_url text)
           on conflict (program_id, start_date) do update set end_date = excluded.end_date, status = excluded.status,
             price_override = excluded.price_override, booking_url = excluded.booking_url`,
          [id, JSON.stringify(list)],
        ),
      ]
    : []),
];

async function insertPhotos(id, photos, owner = "program_id") {
  if (!photos.length || dryRun) return;
  await sql.query(
    `insert into photos (${owner}, position, path, source_url)
     select $1, x.position, x.path, x.source from jsonb_to_recordset($2::jsonb) as x(position int, path text, source text)`,
    [id, JSON.stringify(photos.map((p, position) => ({ ...p, position })))],
  );
}

// ---------- the run ----------
const summary = { at: now, dryRun, new: [], newVenues: [], newOrganizations: [], leadsSaved: [], leadsListed: [], venuesFilled: [], replaced: [], autoUpdated: [], proposed: [], unchanged: [], archivedSkipped: [], refused: [], missing: [], photoProblems: [], unread: [], leads: [] };

const files = (await readdir(OUT).catch(() => [])).filter((f) => f.endsWith(".json") && !f.startsWith("_")).sort();
const report = await readJson(REPORT, { pages: [], leads: [] });
summary.unread = (report.pages ?? []).filter((p) => !p.read).map((p) => `${p.url}${p.note ? ` (${p.note})` : ""}`);
summary.leads = report.leads ?? [];
const seenSlugs = new Set();

for (const f of files) {
  const raw = await readJson(path.join(OUT, f), null);
  const { errors, warnings, record: r } = raw ? validate(raw, f) : { errors: ["not valid JSON"], warnings: [], record: {} };
  if (errors.length) {
    summary.refused.push(`${f}: ${errors.join("; ")}`);
    continue;
  }
  seenSlugs.add(r.slug);
  const [existing] = await sql`
    select p.*, (select count(*)::int from photos ph where ph.program_id = p.id) as photo_count,
      (select coalesce(json_agg(json_build_object('start_date', s.start_date, 'end_date', s.end_date, 'status', s.status,
        'price_override', s.price_override, 'booking_url', s.booking_url) order by s.start_date), '[]'::json)
       from sessions s where s.program_id = p.id) as sessions_json
    from programs p
    where p.slug = ${r.slug} or (p.source_url = ${r.source_url} and lower(p.title) = lower(${r.title}))
    order by (p.slug = ${r.slug}) desc limit 1`;
  const operator = await organization(r.organizer);
  r.organizer = operator.name;
  const operatorId = operator.id;
  const soldThroughId = r.sold_through ? (await organization(r.sold_through, "marketplace")).id : null;
  const values = Object.fromEntries(COLUMNS.map((c) => [c, r[c]]));
  const label = `${r.title} (${r.slug})${warnings.length ? ` [${warnings.length} warning${warnings.length > 1 ? "s" : ""}]` : ""}`;

  if (!existing) {
    if (dryRun) {
      summary.new.push(label);
      continue;
    }
    const id = randomUUID();
    await sql.transaction([
      sql.query(
        `insert into programs (id, slug, status, needs_review, source_url, listing_url, scraped_at, last_seen_at, updated_at, operator_id, sold_through_id, ${COLUMNS.join(", ")})
         values ($1, $2, 'draft', true, $3, $4, $5, $5, $5, $6, $7, ${COLUMNS.map((c, i) => `$${i + 8}${JSONB.has(c) ? "::jsonb" : ""}`).join(", ")})`,
        [id, r.slug, r.source_url, r.listing_url, now, operatorId, soldThroughId, ...COLUMNS.map((c) => param(c, r[c]))],
      ),
      ...replaceUpcomingSessions(id, r.sessions),
    ]);
    await insertPhotos(id, await storePhotos(r.slug, r.images));
    summary.new.push(label);
    continue;
  }

  if (existing.status === "archived") {
    summary.archivedSkipped.push(label);
    continue;
  }

  const live = ["active", "sold_out"].includes(existing.status) && !existing.needs_review;
  // the import stamps updated_at and last_seen_at together, so a later updated_at means a person saved it
  const lastHarvest = new Date(existing.last_seen_at ?? existing.scraped_at ?? 0).getTime();
  const editedByHand = new Date(existing.updated_at).getTime() > lastHarvest + 2000;
  // links a person set stay; the harvest only fills them in
  const seen = {
    last_seen_at: now, updated_at: now, missed_runs: 0, listing_url: existing.listing_url ?? r.listing_url,
    operator_id: existing.operator_id ?? operatorId, sold_through_id: existing.sold_through_id ?? soldThroughId,
  };
  const photos = Number(existing.photo_count) === 0 && r.images.length ? r.images : [];

  if (!live && !editedByHand) {
    if (!dryRun) {
      await sql.transaction([
        // an untouched draft takes the new reading whole, its operator link included
        updateQuery(existing.id, values, { ...seen, operator_id: operatorId, sold_through_id: soldThroughId, source_url: r.source_url, pending_changes: null }),
        ...replaceUpcomingSessions(existing.id, r.sessions),
      ]);
      if (photos.length) await insertPhotos(existing.id, await storePhotos(existing.slug, photos));
    }
    summary.replaced.push(label);
    continue;
  }

  // live or hand-edited: apply what's safe, propose the rest
  const safe = {};
  const fields = {};
  for (const [key, col] of Object.entries(FIELDS)) {
    // numeric columns come back from Postgres as text ("22.5"); compare them as numbers
    if (NUMERIC.has(col) && existing[col] != null) existing[col] = Number(existing[col]);
    if (same(existing[col], r[key])) continue;
    if ((key === "price_min" || key === "price_max") && (existing[col] == null || near(r[key], Number(existing[col])))) safe[col] = r[key];
    else fields[col] = { from: existing[col], to: r[key] };
  }
  const empty = (v) => v == null || same(v, {}) || same(v, []);
  for (const col of FILL_ONLY) if (empty(existing[col]) && !empty(r[col])) safe[col] = r[col];
  const diff = sessionsDiff(existing.sessions_json, r.sessions);
  const pending = {
    foundAt: now,
    ...(Object.keys(fields).length && { fields }),
    ...(diff.changed && !diff.safe && { sessions: { from: diff.upcoming, to: r.sessions } }),
  };
  const proposes = Boolean(pending.fields || pending.sessions);
  if (!dryRun)
    await sql.transaction([
      updateQuery(existing.id, safe, { ...seen, pending_changes: proposes ? pending : existing.pending_changes?.missing ? null : existing.pending_changes }),
      ...(diff.changed && diff.safe ? replaceUpcomingSessions(existing.id, r.sessions) : []),
    ]);
  const applied = Object.keys(safe).length || (diff.changed && diff.safe);
  if (proposes) summary.proposed.push(`${label}: ${[...Object.keys(fields), ...(pending.sessions ? ["dates"] : [])].join(", ")}`);
  if (applied) summary.autoUpdated.push(`${label}: ${[...Object.keys(safe), ...(diff.changed && diff.safe ? ["dates"] : [])].join(", ")}`);
  if (!proposes && !applied) summary.unchanged.push(label);
}

// places to stay (harvest/out/venues/): new ones become hidden drafts; for existing ones only empty
// fields are filled in, since a venue rarely changes and a person's edits always win
const VENUES_OUT = path.join(OUT, "venues");
const venueFiles = (await readdir(VENUES_OUT).catch(() => [])).filter((f) => f.endsWith(".json")).sort();
const VENUE_COLUMNS = ["name", "kind", "stars", "adults_only", "description", "website", "country", "city_region", "lat", "lng", "sports", "amenities", "price_notes"];
const venueParam = (c, v) => (c === "amenities" ? JSON.stringify(v) : v);
for (const f of venueFiles) {
  const raw = await readJson(path.join(VENUES_OUT, f), null);
  const { errors, record: v } = raw ? validateVenue(raw, f) : { errors: ["not valid JSON"], record: {} };
  if (errors.length) {
    summary.refused.push(`venues/${f}: ${errors.join("; ")}`);
    continue;
  }
  seenSlugs.add(v.slug);
  const [existing] = await sql`select * from venues where slug = ${v.slug} or website = ${v.website} order by (slug = ${v.slug}) desc limit 1`;
  if (existing?.status === "archived") {
    summary.archivedSkipped.push(`${v.name} (venue)`);
    continue;
  }
  if (!existing) {
    if (!dryRun) {
      const id = randomUUID();
      await sql.transaction([
        sql.query(
          `insert into venues (id, slug, status, needs_review, source_url, scraped_at, last_seen_at, updated_at, ${VENUE_COLUMNS.join(", ")})
           values ($1, $2, 'draft', true, $3, $4, $4, $4, ${VENUE_COLUMNS.map((c, i) => `$${i + 5}${c === "amenities" ? "::jsonb" : ""}`).join(", ")})`,
          [id, v.slug, v.source_url, now, ...VENUE_COLUMNS.map((c) => venueParam(c, v[c]))],
        ),
        ...(v.courts.length
          ? [
              sql.query(
                `insert into courts (venue_id, position, sport, count, surface, indoor)
                 select $1, x.position, x.sport, x.count, x.surface, x.indoor
                 from jsonb_to_recordset($2::jsonb) as x(position int, sport text, count int, surface text, indoor boolean)`,
                [id, JSON.stringify(v.courts.map((c, position) => ({ ...c, position })))],
              ),
            ]
          : []),
      ]);
      await insertPhotos(id, await storePhotos(v.slug, v.images), "venue_id");
    }
    summary.newVenues.push(`${v.name} (${v.slug})`);
    continue;
  }
  const fill = VENUE_COLUMNS.filter((c) => (existing[c] == null || same(existing[c], [])) && v[c] != null && !same(v[c], []));
  if (!dryRun) {
    const sets = ["last_seen_at = $2", ...fill.map((c, i) => `${c} = $${i + 3}${c === "amenities" ? "::jsonb" : ""}`)];
    await sql.query(`update venues set ${sets.join(", ")} where id = $1`, [existing.id, now, ...fill.map((c) => venueParam(c, v[c]))]);
  }
  if (fill.length) summary.venuesFilled.push(`${v.name}: ${fill.join(", ")}`);
}

// programs a page we read no longer shows
for (const page of (report.pages ?? []).filter((p) => p.read)) {
  const named = new Set(page.programs ?? []);
  const rows = await sql`select id, slug, title, status, needs_review, missed_runs, pending_changes from programs where listing_url = ${page.url} and status <> 'archived'`;
  for (const p of rows.filter((p) => !named.has(p.slug) && !seenSlugs.has(p.slug))) {
    const missed = p.missed_runs + 1;
    const flag = missed >= MISSED_RUNS_TO_FLAG;
    if (!dryRun)
      await sql`update programs set missed_runs = ${missed},
        pending_changes = case when ${flag} then coalesce(pending_changes, '{}'::jsonb) || ${JSON.stringify({ missing: true, foundAt: now })}::jsonb else pending_changes end
        where id = ${p.id}`;
    summary.missing.push(`${p.title} (${p.slug}): not on ${page.url} (${missed} run${missed > 1 ? "s" : ""})${flag ? ", flagged" : ""}`);
  }
}

// leads: operators the harvest found but couldn't list (only on a marketplace, a page that's gone…),
// saved for /admin → Operators → Leads unless we already know them
const hostOf = (u) => {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
};
const marketplaces = await sql`select id, website from organizations where kind = 'marketplace' and website is not null`;
for (const lead of summary.leads) {
  const name = lead.operator?.trim();
  if (!name || (await findOrganization(name))) continue;
  // the same lead under another name: a report names them however the page did
  if (lead.url && (await sql`select 1 from organizations where source_url = ${lead.url} or website = ${lead.url} limit 1`).length) continue;
  const seenOnId = marketplaces.find((m) => hostOf(m.website) && hostOf(m.website) === hostOf(lead.url))?.id ?? null;
  summary.leadsSaved.push(name);
  if (!dryRun) await createOrganization({ name, status: "lead", note: lead.note ?? null, sourceUrl: lead.url ?? null, seenOnId });
}

// mark pages seen only now that their results are in
if (!dryRun) {
  const run = await readJson(RUN, { pages: [] });
  const state = await readJson(STATE, {});
  const read = new Set((report.pages ?? []).filter((p) => p.read).map((p) => p.url));
  for (const p of run.pages) {
    if (p.change === "unchanged") state[p.url] = { ...state[p.url], checkedAt: now };
    else if (read.has(p.url) && p.hash) state[p.url] = { hash: p.hash, checkedAt: now, changedAt: now };
  }
  await writeJson(STATE, Object.fromEntries(Object.entries(state).sort(([a], [b]) => a.localeCompare(b))));
  if (files.length || (report.pages ?? []).length) {
    const done = path.join(CACHE, "imported", now.replace(/[:.]/g, "-"));
    await mkdir(done, { recursive: true });
    for (const f of [...files, "_report.json"]) await rename(path.join(OUT, f), path.join(done, f)).catch(() => {});
    if (venueFiles.length) {
      await mkdir(path.join(done, "venues"), { recursive: true });
      for (const f of venueFiles) await rename(path.join(VENUES_OUT, f), path.join(done, "venues", f)).catch(() => {});
    }
  }
}

// ---------- summary ----------
const SECTIONS = [
  ["new", "New drafts to review"],
  ["newVenues", "New places to stay to review"],
  ["newOrganizations", "New operators (in /admin → Operators)"],
  ["leadsListed", "Leads that now have a listing"],
  ["proposed", "Changes waiting for you (live or edited listings)"],
  ["missing", "No longer on the operator's page"],
  ["refused", "Refused (fix and re-run /harvest)"],
  ["autoUpdated", "Updated automatically"],
  ["replaced", "Drafts refreshed"],
  ["venuesFilled", "Places to stay: gaps filled in"],
  ["unread", "Pages that couldn't be read"],
  ["photoProblems", "Photos that couldn't be used"],
  ["archivedSkipped", "Skipped (archived)"],
];
const lines = [`Court Trips harvest${dryRun ? " (dry run)" : ""}, ${now.slice(0, 16).replace("T", " ")} UTC`, ""];
for (const [key, title] of SECTIONS) {
  if (!summary[key].length) continue;
  lines.push(`${title}: ${summary[key].length}`, ...summary[key].map((s) => `  - ${s}`), "");
}
if (summary.leads.length)
  lines.push(
    `Leads to look at: ${summary.leads.length}${summary.leadsSaved.length ? ` (${summary.leadsSaved.length} new, saved in /admin → Operators → Leads)` : ""}`,
    ...summary.leads.map((l) => `  - ${l.operator}: ${l.url}${l.note ? ` (${l.note})` : ""}`),
    "",
  );
lines.push(`${summary.unchanged.length} unchanged. Review at /admin.`);
const text = lines.join("\n");
console.log(text);
if (!dryRun) await writeJson(path.join(CACHE, "last-summary.json"), summary);

if (email && !dryRun) {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.SUBMISSIONS_NOTIFY_TO?.split(",").map((s) => s.trim()).filter(Boolean);
  if (!key || !to?.length) console.log("(no RESEND_API_KEY / SUBMISSIONS_NOTIFY_TO: summary not emailed)");
  else {
    const subject = `Harvest: ${summary.new.length} new, ${summary.proposed.length} to check, ${summary.missing.length} missing`;
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ from: process.env.RESEND_FROM || "Court Trips <onboarding@resend.dev>", to, subject, text }),
    });
    console.log(res.ok ? `summary emailed to ${to.join(", ")}` : `email failed: ${res.status} ${await res.text()}`);
  }
}
// exit once the output is written, so a lingering connection can't hold a scheduled run open
process.stdout.write("", () => process.exit(0));
