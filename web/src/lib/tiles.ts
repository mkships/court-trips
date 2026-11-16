import type { Listing, Trip } from "@/lib/sports";

// Tiles arrive sorted soonest first (src/lib/db.ts), one per program per date.

// A curated row of `size` tiles: each program's next date first, so one operator's
// back-to-back dates can't fill it; if programs run out, later dates top it up.
// Returned soonest first. Full lists (search, venue, provider pages) skip this.
export function varietyRow(tiles: Listing[], size: number) {
  const seen = new Set<string>();
  const firsts: Listing[] = [];
  const rest: Listing[] = [];
  for (const t of tiles) {
    (seen.has(t.programSlug) ? rest : firsts).push(t);
    seen.add(t.programSlug);
  }
  const picked = new Set([...firsts, ...rest].slice(0, size));
  return tiles.filter((t) => picked.has(t));
}

// One entry per program, for cards: the trip on its next bookable date, with every date in `tiles`
// on its rail and the lowest of their prices. Kept in the order the programs first appear (soonest first).
// Filter the tiles first, so a search for May shows a trip's May dates only.
export function groupTrips(tiles: Listing[]): Trip[] {
  const trips = new Map<string, Trip>();
  for (const t of tiles) {
    let trip = trips.get(t.programSlug);
    if (!trip) {
      trip = { ...t, dates: [] };
      trips.set(t.programSlug, trip);
    } else if (trip.status === "sold_out" && t.status !== "sold_out") {
      // lead with a date that can still be booked
      Object.assign(trip, { key: t.key, start: t.start, end: t.end, status: t.status });
    }
    if (t.start) trip.dates.push({ start: t.start, end: t.end, status: t.status, price: t.priceFrom });
    if (t.priceFrom != null && (trip.priceFrom == null || t.priceFrom < trip.priceFrom)) trip.priceFrom = t.priceFrom;
  }
  return [...trips.values()];
}

// The hero carousel shows each featured program once, on its next bookable date.
export function featuredTiles(tiles: Listing[]) {
  const byProgram = new Map<string, Listing>();
  for (const t of tiles) {
    if (t.featuredRank == null) continue;
    const current = byProgram.get(t.programSlug);
    if (!current || (current.status === "sold_out" && t.status !== "sold_out")) byProgram.set(t.programSlug, t);
  }
  return [...byProgram.values()].sort((a, b) => a.featuredRank! - b.featuredRank!);
}

// A tile opens its program page with the tile's date selected.
export const tileHref = (t: Pick<Listing, "programSlug" | "start">) =>
  `/programs/${t.programSlug}${t.start ? `?date=${t.start}` : ""}`;

export function programCount(tiles: Listing[]) {
  return new Set(tiles.map((t) => t.programSlug)).size;
}
