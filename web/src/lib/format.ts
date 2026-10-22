import type { Listing } from "@/lib/sports";

export const CATEGORY_NAMES: Record<Listing["category"], string> = {
  camp: "Camp",
  clinic: "Clinic",
  social_getaway: "Getaway",
};

const LEVEL_ORDER = ["beginner", "intermediate", "advanced"] as const;

// "All levels", "Advanced", "Intermediate–advanced"
export function levelLabel(level: Listing["level"]) {
  const steps = LEVEL_ORDER.filter((l) => level.includes(l));
  if (level.includes("all levels") || steps.length === LEVEL_ORDER.length || steps.length === 0) return "All levels";
  const text = steps.length === 1 ? steps[0] : `${steps[0]}–${steps[steps.length - 1]}`;
  return text[0].toUpperCase() + text.slice(1);
}

export function placeLabel({ place, country }: Pick<Listing, "place" | "country">) {
  if (!place) return country ?? "";
  if (!country || country.startsWith(place)) return place;
  return `${place}, ${country}`;
}

const day = (iso: string, opts: Intl.DateTimeFormatOptions) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { timeZone: "UTC", ...opts });

// "24–29 Oct 2026", "22 Apr – 1 May 2027", "28 Dec 2026 – 3 Jan 2027"
export function dateRange({ start, end, scheduleNotes }: Pick<Listing, "start" | "end" | "scheduleNotes">) {
  if (!start) return scheduleNotes ? "Seasonal, dates on request" : "Dates on request";
  if (!end || end === start) return day(start, { day: "numeric", month: "short", year: "numeric" });
  const sameYear = start.slice(0, 4) === end.slice(0, 4);
  const sameMonth = sameYear && start.slice(5, 7) === end.slice(5, 7);
  const to = day(end, { day: "numeric", month: "short", year: "numeric" });
  if (sameMonth) return `${Number(start.slice(8))}–${to}`;
  return `${day(start, sameYear ? { day: "numeric", month: "short" } : { day: "numeric", month: "short", year: "numeric" })} – ${to}`;
}

export function priceFrom({ priceFrom, currency }: Pick<Listing, "priceFrom" | "currency">) {
  if (priceFrom == null || !currency) return null;
  return `From ${money(priceFrom, currency)}`;
}

export const PRICE_UNIT_NAMES: Record<NonNullable<Listing["priceUnit"]>, string> = {
  per_person: "per person",
  per_person_sharing: "per person, sharing a room",
};

export const STAY_NAMES = {
  on_site_resort: "Stay on site",
  partner_hotel: "Partner hotel",
  villa: "Villa",
  self_arranged: "Arrange your own stay",
  not_included: "No accommodation",
} as const;

// "6:1" -> "6 players per coach"; "8:1+" -> "8+ players per coach"
export function ratioLabel(ratio: string) {
  const [players] = ratio.split(":");
  return `${players}${ratio.endsWith("+") ? "+" : ""} players per coach`;
}

export function money(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}

export function nights(start: string, end: string) {
  return Math.round((Date.parse(end) - Date.parse(start)) / 86_400_000);
}

export const hostOf = (url: string) => new URL(url).hostname.replace(/^www\./, "");
