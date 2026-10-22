import type { Listing } from "@/lib/sports";

// Tiles arrive sorted soonest first (scripts/seed.py), one per program per date.

// Keeps at most `max` tiles per program, so a curated row isn't filled by one
// operator's back-to-back dates. Full lists (search, venue, provider pages) skip this.
export function capPerProgram(tiles: Listing[], max: number) {
  const seen = new Map<string, number>();
  return tiles.filter((t) => {
    const n = seen.get(t.programSlug) ?? 0;
    seen.set(t.programSlug, n + 1);
    return n < max;
  });
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
