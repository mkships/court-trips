import type { Listing } from "@/lib/sports";

// Tiles arrive sorted soonest first (scripts/seed.py), one per program per date.

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
