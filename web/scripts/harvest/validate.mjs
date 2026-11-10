// The rules a harvested listing file (harvest/out/<slug>.json) has to meet before it's imported:
// directory-schema.json's required fields and option lists, plus the checks that came up reading
// listings by hand. Returns the record cleaned up, with errors (refused) and warnings (imported).
import { readFile } from "node:fs/promises";
import path from "node:path";

const WEB = path.dirname(path.dirname(path.dirname(new URL(import.meta.url).pathname)));
const countriesSource = await readFile(path.join(WEB, "src", "lib", "countries.ts"), "utf8");
export const COUNTRIES = new Set([...countriesSource.matchAll(/^\s+"([^"]+)",?$/gm)].map((m) => m[1]));

// common names that differ from the list's
const ALIASES = {
  turkey: "Türkiye", usa: "United States", us: "United States", "united states of america": "United States", uk: "United Kingdom",
  england: "United Kingdom", scotland: "United Kingdom", wales: "United Kingdom", "great britain": "United Kingdom",
  "czech republic": "Czechia", holland: "Netherlands", "the netherlands": "Netherlands", "south korea": "South Korea",
  vietnam: "Vietnam", bahamas: "Bahamas", "the bahamas": "Bahamas", "st lucia": "Saint Lucia", "st. lucia": "Saint Lucia",
  antigua: "Antigua and Barbuda", "turks & caicos": "Turks and Caicos", "turks and caicos islands": "Turks and Caicos",
  "dominican rep.": "Dominican Republic", bali: "Indonesia", mallorca: "Spain", majorca: "Spain", tenerife: "Spain",
};

const SPORTS = ["tennis", "pickleball", "padel"];
const CATEGORIES = ["camp", "clinic", "social_getaway"];
const LEVELS = ["beginner", "intermediate", "advanced", "all levels"];
const THEMES = ["performance", "couples", "singles", "group", "family", "beginner_friendly"];
const SESSION_STATUSES = ["available", "waitlist", "sold_out"];
const PRICE_UNITS = ["per_person", "per_person_sharing"];
const ACCOMMODATION = ["on_site_resort", "partner_hotel", "villa", "self_arranged", "not_included"];
const SURFACES = ["Hard", "Clay", "Grass", "Artificial Turf", "Carpet"];
const RATIOS = ["1:1", "2:1", "3:1", "4:1", "5:1", "6:1", "8:1+"];
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const isUrl = (v) => {
  try {
    return ["http:", "https:"].includes(new URL(v).protocol);
  } catch {
    return false;
  }
};
const str = (v) => (typeof v === "string" && v.trim() ? v.trim() : null);
const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() && Number.isFinite(Number(v)) ? Number(v) : null);
const list = (v) => (Array.isArray(v) ? v.map((x) => (typeof x === "string" ? x.trim() : x)).filter(Boolean) : []);
export const today = () => new Date().toISOString().slice(0, 10);

export function validate(raw, file = "") {
  const errors = [];
  const warnings = [];
  const err = (m) => errors.push(m);
  const warn = (m) => warnings.push(m);
  const g = (k) => raw?.[k] ?? {};
  const meta = g("meta"), id = g("core_identity"), cat = g("categorization"), loc = g("location"), price = g("pricing"), sport = g("sport_specific"), media = g("media");

  const slug = str(meta.slug);
  if (!slug || !SLUG.test(slug)) err(`meta.slug "${meta.slug}" isn't lowercase-hyphenated`);
  else if (file && path.basename(file, ".json") !== slug) warn(`file name doesn't match slug ${slug}`);
  const sourceUrl = str(meta.source_url);
  if (!sourceUrl || !isUrl(sourceUrl)) err("meta.source_url is missing or not a web address");
  const listingUrl = str(meta.listing_url);
  if (listingUrl && !isUrl(listingUrl)) err("meta.listing_url is not a web address");
  if (!listingUrl) warn("no meta.listing_url: disappearance can't be detected for this one");

  const title = str(id.title);
  const organizer = str(id.organizer);
  // a marketplace (BookRetreats, Weebora…) when the programme can only be booked there; null otherwise
  const soldThrough = str(id.sold_through) || null;
  if (!title) err("core_identity.title is missing");
  if (!organizer) err("core_identity.organizer is missing");
  const bookingUrl = str(id.booking_url) ?? sourceUrl;
  if (bookingUrl && !isUrl(bookingUrl)) err("core_identity.booking_url is not a web address");

  const sports = list(cat.racket_sport).map((s) => String(s).toLowerCase());
  if (!sports.length) err("categorization.racket_sport is empty");
  for (const s of sports) if (!SPORTS.includes(s)) err(`racket_sport "${s}" isn't one of ${SPORTS.join(", ")}`);
  if (!CATEGORIES.includes(cat.category)) err(`category "${cat.category}" isn't one of ${CATEGORIES.join(", ")}`);
  const level = list(cat.level).map((s) => String(s).toLowerCase());
  if (!level.length) err("categorization.level is empty");
  for (const l of level) if (!LEVELS.includes(l)) err(`level "${l}" isn't one of ${LEVELS.join(", ")}`);
  const theme = list(cat.theme).filter((t) => THEMES.includes(t));
  if (cat.gender != null && !["male", "female", "mixed"].includes(cat.gender)) err(`gender "${cat.gender}" isn't male, female or mixed`);

  const country = str(loc.country);
  if (!country) err("location.country is missing");
  else if (!COUNTRIES.has(country)) {
    const alias = ALIASES[country.toLowerCase()];
    const near = alias ? [alias] : [...COUNTRIES].filter((c) => c.toLowerCase().includes(country.toLowerCase().slice(0, 5))).slice(0, 3);
    err(`country "${country}" isn't a name from src/lib/countries.ts${near.length ? ` (did you mean ${near.join(" / ")}?)` : ""}`);
  }
  const lat = num(loc.lat), lng = num(loc.lng);
  if ((lat != null && (lat < -90 || lat > 90)) || (lng != null && (lng < -180 || lng > 180))) err("lat/lng out of range");

  // past dates are dropped, not refused; a program with none left needs schedule notes
  const now = today();
  const seen = new Set();
  const sessions = [];
  for (const [i, s] of (Array.isArray(raw?.sessions) ? raw.sessions : []).entries()) {
    const start = str(s?.start_date), end = str(s?.end_date) ?? start;
    if (!start || !ISO_DATE.test(start) || !ISO_DATE.test(end)) {
      err(`sessions[${i}] dates aren't YYYY-MM-DD`);
      continue;
    }
    if (end < start) err(`sessions[${i}] ends before it starts`);
    if (start < now) {
      warn(`sessions[${i}] (${start}) has passed; dropped`);
      continue;
    }
    if (seen.has(start)) {
      warn(`two sessions start on ${start}; kept the first`);
      continue;
    }
    seen.add(start);
    const status = SESSION_STATUSES.includes(s.status) ? s.status : "available";
    const sessionUrl = str(s.booking_url);
    if (sessionUrl && !isUrl(sessionUrl)) err(`sessions[${i}].booking_url is not a web address`);
    sessions.push({ start_date: start, end_date: end, status, price_override: num(s.price_override), booking_url: sessionUrl });
  }
  sessions.sort((a, b) => a.start_date.localeCompare(b.start_date));
  const scheduleNotes = str(raw?.schedule_notes);
  if (!sessions.length && !scheduleNotes) err("no upcoming sessions and no schedule_notes: say when it runs");

  const priceMin = num(price.price_min), priceMax = num(price.price_max);
  const currency = str(price.currency)?.toUpperCase() ?? null;
  if ((priceMin != null || priceMax != null) && !currency) err("a price without a currency");
  if (currency && !/^[A-Z]{3}$/.test(currency)) err(`currency "${currency}" isn't an ISO code`);
  if (priceMin != null && priceMax != null && priceMax < priceMin) err("price_max is below price_min");
  if ([priceMin, priceMax].some((p) => p != null && p < 0)) err("a negative price");
  if (price.price_unit != null && !PRICE_UNITS.includes(price.price_unit)) err(`price_unit "${price.price_unit}" isn't one of ${PRICE_UNITS.join(", ")}`);

  const surfaces = list(sport.court_surface);
  for (const s of surfaces) if (!SURFACES.includes(s)) err(`court_surface "${s}" isn't one of ${SURFACES.join(", ")}`);
  if (sport.accommodation_type != null && !ACCOMMODATION.includes(sport.accommodation_type)) err(`accommodation_type "${sport.accommodation_type}" isn't one of ${ACCOMMODATION.join(", ")}`);
  const ratio = str(sport.player_to_coach_ratio);
  if (ratio && !RATIOS.includes(ratio)) warn(`player_to_coach_ratio "${ratio}" isn't one of ${RATIOS.join(", ")}; dropped`);

  const images = list(media.images).filter(isUrl).slice(0, 6);
  if (!images.length) warn("no photos");
  const description = str(id.description);
  if (!description || description.length < 40) warn("description missing or very short");
  const score = num(meta.data_quality_score);

  return {
    errors,
    warnings,
    record: {
      slug,
      source_url: sourceUrl,
      listing_url: listingUrl,
      data_quality_score: score == null ? null : Math.max(0, Math.min(1, score)),
      title,
      organizer,
      sold_through: soldThrough,
      description,
      coaches: list(id.coaches),
      languages: list(id.languages),
      booking_url: bookingUrl,
      contact_email: str(id.contact_email),
      contact_phone: str(id.contact_phone),
      sports,
      category: cat.category,
      theme,
      gender: cat.gender ?? null,
      level,
      ratings: raw?.rating_systems && typeof raw.rating_systems === "object" ? raw.rating_systems : {},
      country,
      city_region: str(loc.city_region),
      venue_name: str(loc.venue_name),
      lat,
      lng,
      schedule_notes: scheduleNotes,
      price_min: priceMin ?? priceMax,
      price_max: priceMax ?? priceMin,
      currency,
      price_unit: price.price_unit ?? null,
      price_notes: str(price.price_notes),
      inclusions: list(price.inclusions).map((s) => String(s).toLowerCase()),
      court_surfaces: surfaces,
      coaching_hours_total: num(sport.coaching_hours_total),
      player_to_coach_ratio: ratio && RATIOS.includes(ratio) ? ratio : null,
      capacity: num(sport.capacity) == null ? null : Math.round(num(sport.capacity)),
      accommodation_type: sport.accommodation_type ?? null,
      sessions,
      images,
    },
  };
}

const VENUE_KINDS = ["resort", "hotel", "club", "academy"];

// A place to stay (harvest/out/venues/<slug>.json), in seed/venues.json's shape.
export function validateVenue(raw, file = "") {
  const errors = [];
  const warnings = [];
  const g = (k) => raw?.[k] ?? {};
  const meta = g("meta"), id = g("core_identity"), loc = g("location"), fac = g("facilities"), media = g("media");
  const slug = str(meta.slug);
  if (!slug || !SLUG.test(slug)) errors.push(`meta.slug "${meta.slug}" isn't lowercase-hyphenated`);
  else if (file && path.basename(file, ".json") !== slug) warnings.push(`file name doesn't match slug ${slug}`);
  const name = str(id.name);
  if (!name) errors.push("core_identity.name is missing");
  if (!VENUE_KINDS.includes(id.kind)) errors.push(`kind "${id.kind}" isn't one of ${VENUE_KINDS.join(", ")}`);
  const website = str(id.website) ?? str(meta.source_url);
  if (!website || !isUrl(website)) errors.push("core_identity.website is missing or not a web address");
  const country = str(loc.country);
  if (!country || !COUNTRIES.has(country)) errors.push(`country "${country}" isn't a name from src/lib/countries.ts`);
  const sports = list(fac.racket_sport).map((s) => String(s).toLowerCase());
  if (!sports.length) errors.push("facilities.racket_sport is empty");
  for (const s of sports) if (!SPORTS.includes(s)) errors.push(`racket_sport "${s}" isn't one of ${SPORTS.join(", ")}`);
  const courts = (Array.isArray(fac.courts) ? fac.courts : [])
    .filter((c) => SPORTS.includes(c?.sport))
    .map((c) => ({ sport: c.sport, count: num(c.count), surface: SURFACES.includes(c.surface) ? c.surface : null, indoor: c.indoor === true }));
  const images = list(media.images).filter(isUrl).slice(0, 6);
  if (!images.length) warnings.push("no photos");
  const stars = num(id.stars);
  const lat = num(loc.lat), lng = num(loc.lng);
  return {
    errors,
    warnings,
    record: {
      slug,
      source_url: str(meta.source_url) ?? website,
      listing_url: str(meta.listing_url),
      name,
      kind: id.kind,
      stars: stars != null && stars >= 1 && stars <= 5 ? Math.round(stars) : null,
      adults_only: id.adults_only === true,
      description: str(id.description),
      website,
      country,
      city_region: str(loc.city_region),
      lat: lat != null && Math.abs(lat) <= 90 ? lat : null,
      lng: lng != null && Math.abs(lng) <= 180 ? lng : null,
      sports,
      amenities: list(fac.amenities).map((s) => String(s).toLowerCase()),
      price_notes: str(g("pricing").price_notes),
      courts,
      images,
    },
  };
}
