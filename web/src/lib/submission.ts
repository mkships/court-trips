// "List your program": the validation the server action runs (options live in submission-options.ts).
// A valid submission becomes `data`, shaped like a seed/programs.json record minus `meta` and
// `media`, so turning an approved one into a draft program reuses the import mapping.

import { z } from "zod";
import { COUNTRIES } from "@/lib/countries";
import {
  SPORT_OPTIONS,
  CATEGORY_OPTIONS,
  LEVEL_OPTIONS,
  THEME_OPTIONS,
  GENDER_OPTIONS,
  LANGUAGE_OPTIONS,
  CURRENCY_OPTIONS,
  PRICE_UNIT_OPTIONS,
  INCLUSION_OPTIONS,
  SURFACE_OPTIONS,
  RATIO_OPTIONS,
  ACCOMMODATION_OPTIONS,
  MAX_SESSIONS,
} from "@/lib/submission-options";

export const values = <T extends readonly (readonly [string, ...string[]])[]>(options: T) =>
  options.map((o) => o[0]) as unknown as [T[number][0], ...T[number][0][]];

// FormData gives strings; blanks mean "not given".
export const text = (max: number) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() ? v.trim() : null), z.string().max(max, `Keep it under ${max} characters`).nullable());
export const required = (max: number, message: string) =>
  z.preprocess((v) => (typeof v === "string" ? v.trim() : ""), z.string().min(1, message).max(max, `Keep it under ${max} characters`));
export const number = (min: number, max: number, integer = false) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() ? Number(v) : null),
    (integer ? z.number().int("Use a whole number") : z.number())
      .min(min, `At least ${min}`)
      .max(max, `At most ${max}`)
      .nullable(),
  );
export const choice = <T extends [string, ...string[]]>(options: T, message: string) =>
  z.preprocess((v) => (v === "" ? undefined : v), z.enum(options, { error: message }));
export const optionalChoice = <T extends [string, ...string[]]>(options: T) =>
  z.preprocess((v) => (v === "" || v == null ? null : v), z.enum(options).nullable());
export const many = <T extends [string, ...string[]]>(options: T) => z.array(z.enum(options)).default([]);
export const url = (message: string) =>
  z.preprocess(
    (v) => {
      const s = typeof v === "string" ? v.trim() : "";
      // operators often paste "example.com/booking"
      return s && !/^https?:\/\//i.test(s) ? `https://${s}` : s;
    },
    z.url({ protocol: /^https?$/, error: message }).max(500),
  );
const email = (message: string) => z.preprocess((v) => (typeof v === "string" ? v.trim() : ""), z.email({ error: message }).max(200));
export const list = (max: number) =>
  z.preprocess(
    (v) =>
      typeof v === "string"
        ? v
            .split(/[,\n]/)
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
    z.array(z.string().max(80)).max(max),
  );
export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a date");

const session = z
  .object({ start: isoDate, end: isoDate, price: number(0, 1_000_000) })
  .refine((s) => s.end >= s.start, { message: "A session can't end before it starts", path: ["end"] });

// Field names match the form's input names, so errors map straight back onto inputs.
export const submissionSchema = z
  .object({
    title: required(120, "Give the program a name"),
    organizer: required(120, "Who runs it?"),
    description: z.preprocess(
      (v) => (typeof v === "string" ? v.trim() : ""),
      z.string().min(40, "Describe the program in a few sentences (40 characters or more)").max(3000, "Keep it under 3,000 characters"),
    ),
    booking_url: url("Add the page where players book or find out more"),
    contact_email: z.preprocess((v) => (typeof v === "string" && v.trim() ? v.trim() : null), z.email("Check the email address").nullable()),
    contact_phone: text(40),
    coaches: list(10),
    languages: many([...LANGUAGE_OPTIONS]),

    racket_sport: z.array(z.enum(values(SPORT_OPTIONS))).min(1, "Pick at least one sport"),
    category: choice(values(CATEGORY_OPTIONS), "Pick the kind of program"),
    level: z.array(z.enum(values(LEVEL_OPTIONS))).min(1, "Pick at least one level"),
    theme: many(values(THEME_OPTIONS)),
    gender: optionalChoice(values(GENDER_OPTIONS)),

    country: choice([...COUNTRIES], "Pick the country"),
    city_region: text(120),
    venue_name: text(120),

    sessions: z.array(session).max(MAX_SESSIONS, `Up to ${MAX_SESSIONS} dates; put the rest in the schedule notes`),
    schedule_notes: text(300),

    price_min: number(0, 1_000_000),
    price_max: number(0, 1_000_000),
    currency: optionalChoice([...CURRENCY_OPTIONS]),
    price_unit: optionalChoice(values(PRICE_UNIT_OPTIONS)),
    price_notes: text(300),
    inclusions: many([...INCLUSION_OPTIONS]),
    other_inclusions: list(10),

    court_surface: many([...SURFACE_OPTIONS]),
    coaching_hours_total: number(0, 500),
    player_to_coach_ratio: optionalChoice([...RATIO_OPTIONS]),
    capacity: number(1, 10_000, true),
    accommodation_type: optionalChoice(values(ACCOMMODATION_OPTIONS)),

    dupr_min: number(2, 8),
    dupr_max: number(2, 8),
    utr_min: number(1, 16.5),
    utr_max: number(1, 16.5),
    ntrp_min: number(1, 7),
    ntrp_max: number(1, 7),

    submitter_name: required(120, "Tell us your name"),
    submitter_email: email("Add an email address we can reach you on"),
    consent: z.literal("yes", { error: "Please confirm you can share this listing and its photos" }),
  })
  .superRefine((v, ctx) => {
    // directory-schema.json dates_rule: dated sessions, or notes saying when it runs
    if (v.sessions.length === 0 && !v.schedule_notes)
      ctx.addIssue({ code: "custom", path: ["sessions"], message: "Add at least one date, or say when it runs in the schedule notes" });
    const today = new Date().toISOString().slice(0, 10);
    v.sessions.forEach((s, i) => {
      if (s.start < today) ctx.addIssue({ code: "custom", path: ["sessions", i, "start"], message: "This date has passed" });
    });
    if (v.price_min != null && v.price_max != null && v.price_max < v.price_min)
      ctx.addIssue({ code: "custom", path: ["price_max"], message: "The highest price is below the lowest" });
    if ((v.price_min != null || v.price_max != null) && !v.currency)
      ctx.addIssue({ code: "custom", path: ["currency"], message: "Which currency?" });
    for (const r of ["dupr", "utr", "ntrp"] as const) {
      const [min, max] = [v[`${r}_min`], v[`${r}_max`]];
      if (min != null && max != null && max < min)
        ctx.addIssue({ code: "custom", path: [`${r}_max`], message: "The maximum is below the minimum" });
    }
  });

export type SubmissionInput = z.infer<typeof submissionSchema>;
export type FieldErrors = Partial<Record<string, string>>;

const MULTI = ["languages", "racket_sport", "level", "theme", "inclusions", "court_surface"];

// The form's FormData as the plain object the schema expects.
export function formToObject(form: FormData) {
  const obj: Record<string, unknown> = {};
  for (const key of new Set(form.keys())) {
    if (key.startsWith("session_") || key === "photos") continue;
    obj[key] = MULTI.includes(key) ? form.getAll(key) : form.get(key);
  }
  for (const key of MULTI) obj[key] ??= [];
  const starts = form.getAll("session_start");
  const ends = form.getAll("session_end");
  const prices = form.getAll("session_price");
  // a repeater row left completely blank is ignored rather than an error
  obj.sessions = starts
    .map((start, i) => ({ start, end: ends[i] ?? "", price: prices[i] ?? "" }))
    .filter((s) => s.start || s.end || s.price);
  return obj;
}

// Zod issues → one message per form field. Session rows report as "session_start.2" etc.
export function fieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const [field, index, part] = issue.path;
    const key = field === "sessions" && typeof index === "number" ? `session_${String(part ?? "start")}.${index}` : String(field);
    out[key] ??= issue.message;
  }
  return out;
}

// The validated form in directory-schema.json's retreat_schema shape.
export function toRetreat(v: SubmissionInput) {
  const ratings = Object.fromEntries(
    (["dupr_min", "dupr_max", "utr_min", "utr_max", "ntrp_min", "ntrp_max"] as const).flatMap((k) => (v[k] == null ? [] : [[k, v[k]]])),
  );
  return {
    core_identity: {
      title: v.title,
      organizer: v.organizer,
      description: v.description,
      coaches: v.coaches,
      languages: v.languages,
      booking_url: v.booking_url,
      contact_email: v.contact_email,
      contact_phone: v.contact_phone,
    },
    categorization: {
      racket_sport: v.racket_sport,
      category: v.category,
      theme: v.theme,
      gender: v.gender,
      level: v.level,
    },
    rating_systems: ratings,
    location: { country: v.country, city_region: v.city_region, venue_name: v.venue_name, venue_slug: null, lat: null, lng: null },
    sessions: v.sessions.map((s) => ({
      start_date: s.start,
      end_date: s.end,
      status: "available" as const,
      duration_days: Math.round((Date.parse(s.end) - Date.parse(s.start)) / 86_400_000) + 1,
      ...(s.price != null && { price_override: s.price }),
    })),
    schedule_notes: v.schedule_notes,
    pricing: {
      price_min: v.price_min ?? v.price_max,
      price_max: v.price_max ?? v.price_min,
      currency: v.currency,
      price_unit: v.price_unit,
      price_notes: v.price_notes,
      inclusions: [...new Set([...v.inclusions, ...v.other_inclusions.map((s) => s.toLowerCase())])],
    },
    sport_specific: {
      court_surface: v.court_surface,
      coaching_hours_total: v.coaching_hours_total,
      player_to_coach_ratio: v.player_to_coach_ratio,
      capacity: v.capacity,
      accommodation_type: v.accommodation_type,
    },
  };
}

export type RetreatData = ReturnType<typeof toRetreat>;
