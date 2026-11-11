/**
 * Links programs to the venue they run at. A program names its venue in free text (venue_name);
 * this finds the venue record with that name, or one of its other names (venues.aliases), in the
 * same country, and sets programs.venue_id. The venue's page then lists the program.
 *
 * A name that matches nothing can become a draft venue (hidden, in the admin review queue) so a
 * person can fill it in and publish it; the program is linked to the draft straight away.
 *
 * Used by harvest/import.mjs after every import, and by scripts/link-venues.mjs for a one-off pass.
 */
import { randomUUID } from "node:crypto";

// "Hyatt Regency Vilamoura, Algarve" and "hyatt regency vilamoura algarve" are the same name
export const normalize = (s) =>
  (s ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(the|hotel|resort|club|and|spa)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const slugify = (s) =>
  s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80).replace(/-+$/, "");

// names that aren't a place: "Various clubs", "TBC", "Venue to be confirmed"
const NOT_A_VENUE = /\b(tbc|tba|tbd|various|multiple|several|to be (confirmed|announced)|on request|local clubs?)\b/i;

// One name is the other plus a few words ("Sani Resort" / "Sani Resort Halkidiki"). Both must be
// long enough that a short common word can't match everything.
const contains = (a, b) => a.length >= 8 && b.length >= 8 && (a.includes(b) || b.includes(a));

export function matchVenue(name, country, venues) {
  const wanted = normalize(name);
  if (!wanted) return null;
  const inCountry = venues.filter((v) => v.country === country);
  const names = (v) => [v.name, ...(v.aliases ?? [])].map(normalize).filter(Boolean);
  return inCountry.find((v) => names(v).includes(wanted)) ?? inCountry.find((v) => names(v).some((n) => contains(n, wanted))) ?? null;
}

/**
 * @param sql   a neon() client
 * @param write false: only report what would happen
 * @param create also make draft venues for names that match nothing
 * @returns { linked: string[], created: string[], unmatched: string[] } lines for a report
 */
export async function linkVenues(sql, { write = false, create = false } = {}) {
  // a database that hasn't had the aliases migration yet (0006) can still be reported on, by name only
  const all = await sql`select id, slug, name, aliases, country, status from venues`.catch((error) => {
    if (error.code !== "42703") throw error;
    return sql`select id, slug, name, country, status from venues`;
  });
  const venues = all.filter((v) => v.status !== "archived");
  // a venue someone archived stays gone: its name is neither linked nor made again
  const archived = all.filter((v) => v.status === "archived");
  const programs = await sql`
    select id, slug, title, venue_name, country, city_region, sports, lat, lng from programs
    where venue_id is null and venue_name is not null and trim(venue_name) <> '' and status <> 'archived'
    order by slug`;
  const result = { linked: [], created: [], unmatched: [] };

  for (const p of programs) {
    let venue = matchVenue(p.venue_name, p.country, venues);
    const makeable = !NOT_A_VENUE.test(p.venue_name) && normalize(p.venue_name).length >= 4 && !matchVenue(p.venue_name, p.country, archived);
    if (!venue && create && makeable) {
      let slug = slugify(p.venue_name) || "venue";
      for (let n = 2; all.some((v) => v.slug === slug); n++) slug = `${slugify(p.venue_name)}-${n}`;
      venue = { id: randomUUID(), slug, name: p.venue_name.trim(), aliases: [], country: p.country };
      if (write) {
        // "club" is a placeholder: the kind, courts and everything else are for the reviewer to fill in
        await sql`insert into venues (id, slug, status, needs_review, name, kind, country, city_region, lat, lng, sports)
          values (${venue.id}, ${slug}, 'draft', true, ${venue.name}, 'club', ${p.country}, ${p.city_region}, ${p.lat}, ${p.lng}, ${p.sports})`;
      }
      venues.push(venue);
      all.push(venue);
      result.created.push(`${venue.name} (${p.country}) → /admin/venues/${slug}`);
    }
    if (!venue) {
      result.unmatched.push(`${p.slug}: "${p.venue_name}" (${p.country})`);
      continue;
    }
    if (write) await sql`update programs set venue_id = ${venue.id}, updated_at = now() where id = ${p.id}`;
    result.linked.push(`${p.slug}: "${p.venue_name}" → ${venue.name}`);
  }
  return result;
}
