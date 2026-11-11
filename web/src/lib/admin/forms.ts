// The admin editors' forms: validation for what gets saved. Field names match the inputs
// (src/components/admin/ProgramEditor.tsx, VenueEditor.tsx), as on the public form.

import { z } from "zod";
import { CATEGORIES, ORGANIZATION_KINDS, ORGANIZATION_STATUSES, RATING_SOURCES, SESSION_STATUSES, VENUE_KINDS } from "@/db/schema";
import { COUNTRIES } from "@/lib/countries";
import { isoDate, list, many, number, optionalChoice, required, text, url, values } from "@/lib/submission";
import {
  ACCOMMODATION_OPTIONS,
  CURRENCY_OPTIONS,
  LEVEL_OPTIONS,
  PRICE_UNIT_OPTIONS,
  RATIO_OPTIONS,
  SPORT_OPTIONS,
  SURFACE_OPTIONS,
} from "@/lib/submission-options";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const session = z
  .object({
    start: isoDate,
    end: isoDate,
    status: z.enum(SESSION_STATUSES),
    price: number(0, 1_000_000),
    booking_url: z.preprocess((v) => (typeof v === "string" && v.trim() ? v.trim() : null), z.url({ protocol: /^https?$/ }).nullable()),
  })
  .refine((s) => s.end >= s.start, { message: "A session can't end before it starts", path: ["end"] });

export const programFormSchema = z
  .object({
    slug: z.preprocess((v) => (typeof v === "string" ? v.trim().toLowerCase() : ""), z.string().regex(SLUG, "Lowercase letters, numbers and hyphens").max(80)),
    title: required(160, "Give the program a name"),
    organizer: required(120, "Who runs it?"),
    // a marketplace's id, when the programme can only be booked through one
    sold_through_id: z.preprocess((v) => (v ? v : null), z.uuid().nullable()),
    description: text(4000),
    booking_url: url("Add the booking page"),
    source_url: z.preprocess((v) => (typeof v === "string" && v.trim() ? v.trim() : null), z.url({ protocol: /^https?$/ }).nullable()),
    coaches: list(10),

    racket_sport: z.array(z.enum(values(SPORT_OPTIONS))).min(1, "Pick at least one sport"),
    category: z.enum(CATEGORIES, { error: "Pick the kind of program" }),
    level: z.array(z.enum(values(LEVEL_OPTIONS))).min(1, "Pick at least one level"),

    country: z.enum([...COUNTRIES] as [string, ...string[]], { error: "Pick the country" }),
    city_region: text(120),
    venue_name: text(160),
    venue_id: z.preprocess((v) => (v ? v : null), z.uuid().nullable()),
    lat: number(-90, 90),
    lng: number(-180, 180),

    sessions: z.array(session).max(100),
    schedule_notes: text(300),

    price_min: number(0, 1_000_000),
    price_max: number(0, 1_000_000),
    currency: optionalChoice([...CURRENCY_OPTIONS]),
    price_unit: optionalChoice(values(PRICE_UNIT_OPTIONS)),
    price_notes: text(300),
    // one per line or comma-separated, as written on the operator's page
    inclusions: list(30),

    court_surface: many([...SURFACE_OPTIONS]),
    coaching_hours_total: number(0, 500),
    player_to_coach_ratio: optionalChoice([...RATIO_OPTIONS]),
    capacity: number(1, 10_000, true),
    accommodation_type: optionalChoice(values(ACCOMMODATION_OPTIONS)),
    featured_rank: number(1, 20, true),

    // photo ids to take off the listing
    remove_photo: z.array(z.coerce.number().int()).default([]),
  })
  .superRefine((v, ctx) => {
    if (v.price_min != null && v.price_max != null && v.price_max < v.price_min)
      ctx.addIssue({ code: "custom", path: ["price_max"], message: "The highest price is below the lowest" });
    if ((v.price_min != null || v.price_max != null) && !v.currency)
      ctx.addIssue({ code: "custom", path: ["currency"], message: "Which currency?" });
    const starts = v.sessions.map((s) => s.start);
    starts.forEach((s, i) => {
      if (starts.indexOf(s) !== i) ctx.addIssue({ code: "custom", path: ["sessions", i, "start"], message: "Two sessions start on this date" });
    });
  });

export type ProgramForm = z.infer<typeof programFormSchema>;

const MULTI = ["racket_sport", "level", "court_surface", "remove_photo"];

export function programFormToObject(form: FormData) {
  const obj: Record<string, unknown> = {};
  for (const key of new Set(form.keys())) {
    if (key.startsWith("session_") || key.startsWith("$ACTION") || key === "intent") continue;
    obj[key] = MULTI.includes(key) ? form.getAll(key) : form.get(key);
  }
  for (const key of MULTI) obj[key] ??= [];
  const col = (name: string) => form.getAll(`session_${name}`).map(String);
  const [starts, ends, statuses, prices, urls] = ["start", "end", "status", "price", "url"].map(col);
  // a row left completely blank is ignored rather than an error
  obj.sessions = starts
    .map((start, i) => ({ start, end: ends[i] ?? "", status: statuses[i] || "available", price: prices[i] ?? "", booking_url: urls[i] ?? "" }))
    .filter((s) => s.start || s.end || s.price || s.booking_url);
  return obj;
}

export const venueFormSchema = z.object({
  slug: z.preprocess((v) => (typeof v === "string" ? v.trim().toLowerCase() : ""), z.string().regex(SLUG, "Lowercase letters, numbers and hyphens").max(80)),
  name: required(160, "Give the venue a name"),
  kind: z.enum(VENUE_KINDS, { error: "Pick the kind of venue" }),
  stars: number(1, 5, true),
  adults_only: z.preprocess((v) => v === "yes", z.boolean()),
  description: text(4000),
  website: z.preprocess((v) => (typeof v === "string" && v.trim() ? v.trim() : null), z.url({ protocol: /^https?$/, error: "Check the address" }).nullable()),
  country: z.enum([...COUNTRIES] as [string, ...string[]], { error: "Pick the country" }),
  city_region: text(120),
  lat: number(-90, 90),
  lng: number(-180, 180),
  sports: z.array(z.enum(values(SPORT_OPTIONS))).min(1, "Pick at least one sport"),
  price_notes: text(300),
  // what's on site, one per line
  amenities: list(40),
  // other names listings use for this venue, one per line
  aliases: list(20),
  courts: z
    .array(
      z.object({
        sport: z.enum(values(SPORT_OPTIONS)),
        count: number(1, 200, true),
        surface: optionalChoice([...SURFACE_OPTIONS]),
        indoor: z.preprocess((v) => v === "yes", z.boolean()),
      }),
    )
    .default([]),
  // photo ids to take off the venue
  remove_photo: z.array(z.coerce.number().int()).default([]),
});

export type VenueForm = z.infer<typeof venueFormSchema>;

export function venueFormToObject(form: FormData) {
  const obj: Record<string, unknown> = {};
  for (const key of new Set(form.keys())) {
    if (key.startsWith("$ACTION") || key === "intent") continue;
    obj[key] = key === "sports" || key === "remove_photo" ? form.getAll(key) : form.get(key);
  }
  obj.sports ??= [];
  // one court row per sport select; the other columns line up with it
  const col = (name: string) => form.getAll(`court_${name}`).map(String);
  const [sports, counts, surfaces, indoor] = ["sport", "count", "surface", "indoor"].map(col);
  obj.courts = sports.map((sport, i) => ({ sport, count: counts[i] ?? "", surface: surfaces[i] ?? "", indoor: indoor[i] ?? "" }));
  for (const key of Object.keys(obj)) if (key.startsWith("court_")) delete obj[key];
  return obj;
}

// Ratings on other sites (src/components/admin/RatingsFields.tsx): one row of inputs per site.
// A row left blank means "no rating there"; a row that's started needs a score and a link.
const ratingSchema = z.object({
  source: z.enum(RATING_SOURCES),
  rating: z.preprocess((v) => (typeof v === "string" && v.trim() ? Number(v) : NaN), z.number().min(0).max(5)),
  reviewCount: number(0, 100_000_000, true),
  url: z.preprocess((v) => {
    const s = typeof v === "string" ? v.trim() : "";
    return s && !/^https?:\/\//i.test(s) ? `https://${s}` : s;
  }, z.url({ protocol: /^https?$/ }).max(500)),
});
export type RatingForm = z.infer<typeof ratingSchema>;

export function ratingsFromForm(form: FormData): { ok: true; rows: RatingForm[] } | { ok: false; error: string } {
  const field = (name: string) => String(form.get(name) ?? "").trim();
  const rows = RATING_SOURCES.map((source) => ({
    source,
    rating: field(`rating_${source}`),
    reviewCount: field(`rating_count_${source}`),
    url: field(`rating_url_${source}`),
  })).filter((r) => r.rating || r.reviewCount || r.url);
  const parsed = z.array(ratingSchema).safeParse(rows);
  return parsed.success ? { ok: true, rows: parsed.data } : { ok: false, error: "Each rating needs a score from 0 to 5 and a link to the page it's on" };
}

// "Lake Garda tennis camp!" -> "lake-garda-tennis-camp"
export const slugify = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/, "");

const optionalUrl = z.preprocess((v) => (typeof v === "string" && v.trim() ? v.trim() : null), z.url({ protocol: /^https?$/, error: "Check the address" }).nullable());

export const organizationFormSchema = z.object({
  slug: z.preprocess((v) => (typeof v === "string" ? v.trim().toLowerCase() : ""), z.string().regex(SLUG, "Lowercase letters, numbers and hyphens").max(80)),
  name: required(120, "Give it a name"),
  kind: z.enum(ORGANIZATION_KINDS, { error: "Operator or marketplace?" }),
  status: z.enum(ORGANIZATION_STATUSES, { error: "Pick a status" }),
  website: optionalUrl,
  description: text(2000),
  country: z.preprocess((v) => (v ? v : null), z.enum([...COUNTRIES] as [string, ...string[]]).nullable()),
  sports: z.array(z.enum(values(SPORT_OPTIONS))).default([]),
  // other spellings listings use, one per line or comma-separated
  aliases: list(20),
  note: text(2000),
  source_url: optionalUrl,
  seen_on_id: z.preprocess((v) => (v ? v : null), z.uuid().nullable()),
});

export type OrganizationForm = z.infer<typeof organizationFormSchema>;

export function organizationFormToObject(form: FormData) {
  const obj: Record<string, unknown> = {};
  for (const key of new Set(form.keys())) {
    if (key.startsWith("$ACTION") || key === "intent") continue;
    obj[key] = key === "sports" || key === "remove_photo" ? form.getAll(key) : form.get(key);
  }
  obj.sports ??= [];
  return obj;
}
