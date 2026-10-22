import type { Listing, Sport, Venue } from "@/lib/sports";
import { SPORTS } from "@/lib/sports";

// One set of filter rules for the search bar's counts and the /search page.

export type SearchKey = "where" | "month" | "level" | "format" | "guests" | "courts";
export type SearchValues = Partial<Record<SearchKey, string>>;

// Does a tile pass every chosen filter except `skip`? The bar uses `skip` so each panel's
// counts reflect the other choices (pick Greece, and the month cards count only Greek trips).
// Typed places match loosely, so "greece" or "gree" still finds Greece.
const inPlace = (country: string | null, where: string) => !!country?.toLowerCase().includes(where.trim().toLowerCase());

export function matchesTile(t: Listing, v: SearchValues, skip?: SearchKey) {
  if (skip !== "where" && v.where && !inPlace(t.country, v.where)) return false;
  if (skip !== "month" && v.month && !t.start?.startsWith(v.month)) return false;
  if (
    skip !== "level" &&
    v.level &&
    !t.level.includes(v.level as Listing["level"][number]) &&
    !t.level.includes("all levels")
  )
    return false;
  if (skip !== "format" && v.format && t.category !== v.format) return false;
  return true;
}

// Guests can't filter yet: venues don't record capacity, so it's carried but not applied.
export function matchesVenue(venue: Venue, sport: Sport, v: SearchValues) {
  if (v.where && !inPlace(venue.country, v.where)) return false;
  if (v.courts && !venue.courts.some((c) => c.sport === sport && c.surface === v.courts)) return false;
  return true;
}

type RawParams = Record<string, string | string[] | undefined>;
const one = (p: RawParams, key: string) => {
  const value = p[key];
  return (Array.isArray(value) ? value[0] : value)?.trim() || undefined;
};

export function parseSearch(p: RawParams) {
  const sport = SPORTS.find((s) => s === one(p, "sport")) ?? "tennis";
  const mode = one(p, "type") === "places" ? ("places" as const) : ("programs" as const);
  const values: SearchValues = {};
  for (const key of ["where", "month", "level", "format", "guests", "courts"] as const) {
    const value = one(p, key);
    if (value) values[key] = value;
  }
  return { sport, mode, values };
}

// The same search with one filter removed, for the "remove filter" chips.
export function searchHref(sport: Sport, mode: "programs" | "places", values: SearchValues, without?: SearchKey) {
  const q = new URLSearchParams({ sport, type: mode });
  for (const [k, v] of Object.entries(values)) if (v && k !== without) q.set(k, v);
  return `/search?${q}`;
}
