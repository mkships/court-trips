// Automatic checks on a listing before it goes live: the ones that came up checking listings by hand.
// Errors block publishing; warnings are worth a look but can be right (a program with one photo).

export type Check = { level: "error" | "warning"; message: string; field?: string };

type ProgramForChecks = {
  title: string;
  organizer: string;
  description: string | null;
  sports: string[];
  category: string;
  level: string[];
  country: string;
  bookingUrl: string;
  scheduleNotes: string | null;
  priceMin: number | null;
  priceMax: number | null;
  currency: string | null;
  sessions: { startDate: string; endDate: string; bookingUrl: string | null }[];
  photoCount: number;
};

const today = () => new Date().toISOString().slice(0, 10);

// Dates written into a booking link: 2027-07-10, 20270710, 10-07-2027 or 10/07/2027.
function datesInUrl(url: string): string[] {
  const text = decodeURIComponent(url);
  const found = new Set<string>();
  for (const [, y, m, d] of text.matchAll(/(20\d\d)[-/]?(0[1-9]|1[0-2])[-/]?(0[1-9]|[12]\d|3[01])(?!\d)/g)) found.add(`${y}-${m}-${d}`);
  for (const [, d, m, y] of text.matchAll(/(?<!\d)(0[1-9]|[12]\d|3[01])[-/.](0[1-9]|1[0-2])[-/.](20\d\d)/g)) found.add(`${y}-${m}-${d}`);
  return [...found];
}

const isHttps = (url: string) => {
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
};

export function programChecks(p: ProgramForChecks): Check[] {
  const checks: Check[] = [];
  const error = (message: string, field?: string) => checks.push({ level: "error", message, field });
  const warning = (message: string, field?: string) => checks.push({ level: "warning", message, field });

  if (!p.title.trim()) error("No program name", "title");
  if (!p.organizer.trim()) error("No operator", "organizer");
  if (p.sports.length === 0) error("No sport", "racket_sport");
  if (p.level.length === 0) error("No playing level", "level");
  if (!p.country) error("No country", "country");
  if (!p.bookingUrl) error("No booking link", "booking_url");
  else if (!isHttps(p.bookingUrl)) warning("The booking link isn't https", "booking_url");
  if ((p.priceMin != null || p.priceMax != null) && !p.currency) error("A price without a currency", "currency");
  if (p.priceMin != null && p.priceMax != null && p.priceMax < p.priceMin) error("The highest price is below the lowest", "price_max");

  const now = today();
  const upcoming = p.sessions.filter((s) => s.startDate >= now);
  const past = p.sessions.length - upcoming.length;
  if (p.sessions.length === 0 && !p.scheduleNotes) error("No dates and no schedule notes", "sessions");
  else if (upcoming.length === 0 && !p.scheduleNotes) warning("No upcoming dates: it will show as “dates on request”", "sessions");
  if (past > 0) warning(`${past} ${past === 1 ? "date has" : "dates have"} passed and won't show`, "sessions");

  // Active Away's listing pages show every date a day before the one in its booking link
  for (const s of p.sessions) {
    if (!s.bookingUrl) continue;
    const inUrl = datesInUrl(s.bookingUrl);
    if (inUrl.length && !inUrl.includes(s.startDate) && !inUrl.includes(s.endDate))
      warning(`The ${s.startDate} session's booking link mentions ${inUrl.join(", ")}`, "sessions");
  }

  if (!p.description || p.description.trim().length < 40) warning("The description is missing or very short", "description");
  if (p.photoCount === 0) warning("No photos: the card shows the court drawing instead");
  return checks;
}

export type VenueForChecks = { name: string; kind: string; country: string; sports: string[]; website: string | null; lat: number | null; lng: number | null };

export function venueChecks(v: VenueForChecks): Check[] {
  const checks: Check[] = [];
  if (!v.name.trim()) checks.push({ level: "error", message: "No name", field: "name" });
  if (!v.country) checks.push({ level: "error", message: "No country", field: "country" });
  if (v.sports.length === 0) checks.push({ level: "error", message: "No sport", field: "sports" });
  if (!v.website) checks.push({ level: "warning", message: "No website: the card links nowhere", field: "website" });
  if (v.lat == null || v.lng == null) checks.push({ level: "warning", message: "No map position yet", field: "lat" });
  return checks;
}

export const hasErrors = (checks: Check[]) => checks.some((c) => c.level === "error");
