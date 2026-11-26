import { countryLabel, countrySlug, inCountry } from "@/lib/country-info";
import { convert, type Rates } from "@/lib/currency";
import { SPORTS, SPORT_NAMES, type Listing, type Sport } from "@/lib/sports";
import { programCount } from "@/lib/tiles";

// The pages people land on from a search: one per sport ("/padel"), per sport and format
// ("/pickleball/camps"), per sport and country ("/padel/spain"), and a hub per country
// ("/destinations/spain"). Which ones exist is worked out from the live listings, so a page appears
// when there are enough trips for it and goes when there aren't. /trips stays the search.

// A sport-and-country page or a country hub with fewer trips than this would be a near-empty page.
export const MIN_TRIPS = 3;

export const FORMATS = [
  { slug: "camps", category: "camp" },
  { slug: "clinics", category: "clinic" },
  { slug: "getaways", category: "social_getaway" },
] as const;
export type Format = Listing["category"];
export const formatSlug = (format: Format) => FORMATS.find((f) => f.category === format)!.slug;
export const FORMAT_LABELS: Record<Format, string> = { camp: "Camps", clinic: "Clinics", social_getaway: "Getaways" };

export type Landing =
  | { kind: "sport"; sport: Sport }
  | { kind: "format"; sport: Sport; format: Format }
  | { kind: "place"; sport: Sport; country: string }
  | { kind: "destination"; country: string };

// What each sport's trips are called by the people looking for them. Americans search for pickleball
// "camps", "vacations" and "getaways"; Britons for padel and tennis "holidays". `one` is a single trip,
// for sentences ("How much does a padel holiday cost?").
const WORDS: Record<Sport, { hub: string; place: string; one: string } & Record<Format, string>> = {
  tennis: {
    hub: "Tennis holidays and adult tennis camps",
    camp: "Adult tennis camps",
    clinic: "Tennis clinics for adults",
    social_getaway: "Tennis holidays and getaways",
    place: "Tennis holidays and camps",
    one: "tennis holiday",
  },
  pickleball: {
    hub: "Pickleball camps, vacations and getaways",
    camp: "Pickleball camps for adults",
    clinic: "Pickleball clinics",
    social_getaway: "Pickleball vacations and getaways",
    place: "Pickleball vacations and camps",
    one: "pickleball vacation",
  },
  padel: {
    hub: "Padel holidays and camps",
    camp: "Padel camps",
    clinic: "Padel clinics",
    social_getaway: "Padel holidays and getaways",
    place: "Padel holidays and camps",
    one: "padel holiday",
  },
};
const ONE_FORMAT: Record<Format, string> = { camp: "camp", clinic: "clinic", social_getaway: "getaway" };

// "Tennis, padel and pickleball"
const listed = (items: string[]) => (items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`);
export const sportsIn = (tiles: Listing[]) => SPORTS.filter((s) => tiles.some((t) => t.sports.includes(s)));

export function landingHref(page: Landing) {
  if (page.kind === "sport") return `/${page.sport}`;
  if (page.kind === "format") return `/${page.sport}/${formatSlug(page.format)}`;
  if (page.kind === "place") return `/${page.sport}/${countrySlug(page.country)}`;
  return `/destinations/${countrySlug(page.country)}`;
}

// The page's heading, in the searcher's words. `tiles` are the page's own (a destination names its sports).
export function landingHeading(page: Landing, tiles: Listing[]) {
  if (page.kind === "sport") return WORDS[page.sport].hub;
  if (page.kind === "format") return WORDS[page.sport][page.format];
  if (page.kind === "place") return `${WORDS[page.sport].place} ${inCountry(page.country)}`;
  const sports = sportsIn(tiles).map((s) => SPORT_NAMES[s].toLowerCase());
  return `${listed(sports).replace(/^./, (c) => c.toUpperCase())} trips ${inCountry(page.country)}`;
}

// One trip of the page's kind: "padel holiday in Spain", "pickleball camp".
export function landingNoun(page: Landing) {
  if (page.kind === "sport") return WORDS[page.sport].one;
  if (page.kind === "format") return `${page.sport} ${ONE_FORMAT[page.format]}`;
  if (page.kind === "place") return `${WORDS[page.sport].one} ${inCountry(page.country)}`;
  return `racket trip ${inCountry(page.country)}`;
}

export function tilesFor(page: Landing, listings: Listing[]) {
  return listings.filter((t) => {
    if (page.kind !== "destination" && !t.sports.includes(page.sport)) return false;
    if (page.kind === "format") return t.category === page.format;
    if (page.kind === "place" || page.kind === "destination") return t.country === page.country;
    return true;
  });
}

// Every landing page the listings support, hubs first.
export function landingPages(listings: Listing[]): Landing[] {
  const enough = (page: Landing) => programCount(tilesFor(page, listings)) >= MIN_TRIPS;
  const countries = [...new Set(listings.map((t) => t.country).filter((c): c is string => !!c))].sort();
  const sports = sportsIn(listings);
  return [
    ...sports.map((sport): Landing => ({ kind: "sport", sport })),
    ...sports.flatMap((sport) => FORMATS.map((f): Landing => ({ kind: "format", sport, format: f.category }))).filter(enough),
    ...sports.flatMap((sport) => countries.map((country): Landing => ({ kind: "place", sport, country }))).filter(enough),
    ...countries.map((country): Landing => ({ kind: "destination", country })).filter(enough),
  ];
}

// The page at an address, or null when there isn't one (an unknown word, or too few trips).
export function landingAt(path: string, listings: Listing[]) {
  return landingPages(listings).find((page) => landingHref(page) === path) ?? null;
}

// Where a search on /trips belongs in a search engine's eyes: the landing page that shows the same
// trips when there is one (padel in Spain, pickleball camps), else the sport's own page.
export function landingForSearch(sport: Sport, values: { where?: string; format?: string; month?: string; level?: string }, listings: Listing[]) {
  const set = (["where", "format", "month", "level"] as const).filter((k) => values[k]);
  let page: Landing = { kind: "sport", sport };
  if (set.length === 1 && values.where) page = { kind: "place", sport, country: values.where };
  if (set.length === 1 && values.format && FORMATS.some((f) => f.category === values.format)) page = { kind: "format", sport, format: values.format as Format };
  return landingAt(landingHref(page), listings) ? landingHref(page) : `/${sport}`;
}

// What the listings on a page add up to. Shown as the page's facts and used to answer its questions.
export type Facts = {
  trips: number;
  operators: string[];
  countries: string[];
  // towns and resorts, most trips first
  places: string[];
  // the lowest-priced trip, in its own currency (the visitor's currency is applied when shown)
  cheapest: { amount: number; currency: string; unit: Listing["priceUnit"] } | null;
  // "YYYY-MM" of the first and last start date, and the months with the most
  firstMonth: string | null;
  lastMonth: string | null;
  busiest: string[];
  // trips open to beginners or to all levels
  beginners: number;
};

const byCount = (items: (string | null)[]) => {
  const counts = new Map<string, number>();
  for (const item of items) if (item) counts.set(item, (counts.get(item) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([item]) => item);
};

export function factsFor(tiles: Listing[], rates: Rates | null): Facts {
  // one row per trip for the counts; every date for the calendar
  const trips = [...new Map(tiles.map((t) => [t.programSlug, t])).values()];
  const priced = tiles.filter((t) => t.priceFrom != null && t.currency);
  // prices are in the operators' currencies, so compare them in euros; without rates, as listed
  const inEuros = (t: Listing) => convert(t.priceFrom!, t.currency!, "EUR", rates) ?? t.priceFrom!;
  const low = priced.length ? priced.reduce((a, b) => (inEuros(b) < inEuros(a) ? b : a)) : null;
  const months = tiles.flatMap((t) => (t.start ? [t.start.slice(0, 7)] : [])).sort();
  const perMonth = new Map<string, number>();
  for (const m of months) perMonth.set(m.slice(5), (perMonth.get(m.slice(5)) ?? 0) + 1);
  return {
    trips: trips.length,
    operators: byCount(trips.map((t) => t.organizer)),
    countries: byCount(trips.map((t) => t.country)),
    places: byCount(trips.map((t) => t.place?.split(",")[0] ?? null)),
    cheapest: low ? { amount: low.priceFrom!, currency: low.currency!, unit: low.priceUnit } : null,
    firstMonth: months[0] ?? null,
    lastMonth: months[months.length - 1] ?? null,
    // the two calendar months with the most start dates, when the dates are spread over enough of the
    // year for that to say something
    busiest: perMonth.size >= 4 ? [...perMonth].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 2).map(([m]) => m) : [],
    beginners: trips.filter((t) => t.level.includes("beginner") || t.level.includes("all levels")).length,
  };
}

// "Mallorca, Barcelona and Marbella", "Active Away, Rafa Nadal Academy and 3 others"
export function some(items: string[], max: number, rest: [string, string] = ["other", "others"]) {
  if (items.length <= max) return listed(items);
  const more = items.length - (max - 1);
  return `${items.slice(0, max - 1).join(", ")} and ${more} ${more === 1 ? rest[0] : rest[1]}`;
}

// The pages of one kind with the most trips, busiest first: what the footer and the header menu name.
export function busiest<K extends Landing["kind"]>(kind: K, listings: Listing[], pages = landingPages(listings)) {
  return pages
    .filter((page): page is Extract<Landing, { kind: K }> => page.kind === kind)
    .map((page) => ({ page, trips: programCount(tilesFor(page, listings)) }))
    .sort((a, b) => b.trips - a.trips);
}

// The header's Trips menu: a column per sport (its formats, then its busiest countries) and a column
// of country hubs. Only pages that exist are in it, so it follows the listings like the pages do.
// `sport`, `format` or `country` says what a link leads to, so it can be drawn with that thing's icon.
export type MenuLink = { href: string; label: string; count?: number; sport?: Sport; format?: Format; country?: string };
export type TripsMenu = {
  sports: { sport: Sport; name: string; href: string; trips: number; formats: MenuLink[]; countries: MenuLink[] }[];
  destinations: MenuLink[];
};
const MENU_COUNTRIES = 5;
const MENU_DESTINATIONS = 6;

export function tripsMenu(listings: Listing[]): TripsMenu {
  const pages = landingPages(listings);
  const places = busiest("place", listings, pages);
  return {
    sports: busiest("sport", listings, pages)
      // in the site's own order of sports, not by size
      .sort((a, b) => SPORTS.indexOf(a.page.sport) - SPORTS.indexOf(b.page.sport))
      .map(({ page: { sport }, trips }) => ({
        sport,
        name: SPORT_NAMES[sport],
        href: `/${sport}`,
        trips,
        formats: pages
          .filter((p): p is Extract<Landing, { kind: "format" }> => p.kind === "format" && p.sport === sport)
          .map((p) => ({ href: landingHref(p), label: FORMAT_LABELS[p.format], format: p.format })),
        countries: places
          .filter(({ page }) => page.sport === sport)
          .slice(0, MENU_COUNTRIES)
          .map(({ page, trips: count }) => ({ href: landingHref(page), label: countryLabel(page.country), count, country: page.country })),
      })),
    destinations: busiest("destination", listings, pages)
      .slice(0, MENU_DESTINATIONS)
      .map(({ page, trips: count }) => ({ href: landingHref(page), label: countryLabel(page.country), count, country: page.country })),
  };
}
