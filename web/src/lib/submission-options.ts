// "List your program": the form's options (from directory-schema.json v2.2) and limits.
// Kept apart from the validation in submission.ts so the form doesn't ship zod to browsers.

export const SPORT_OPTIONS = [
  ["tennis", "Tennis"],
  ["pickleball", "Pickleball"],
  ["padel", "Padel"],
] as const;
export const CATEGORY_OPTIONS = [
  ["camp", "Camp", "Several days of coaching, often with accommodation"],
  ["clinic", "Clinic", "A shorter coaching event: a day, a weekend, a few sessions"],
  ["social_getaway", "Getaway", "A holiday with play and some coaching, built around the trip"],
] as const;
export const LEVEL_OPTIONS = [
  ["beginner", "Beginner"],
  ["intermediate", "Intermediate"],
  ["advanced", "Advanced"],
  ["all levels", "All levels"],
] as const;
export const THEME_OPTIONS = [
  ["performance", "Performance"],
  ["couples", "Couples"],
  ["singles", "Singles"],
  ["group", "Groups"],
  ["family", "Families"],
  ["beginner_friendly", "Beginner friendly"],
] as const;
export const GENDER_OPTIONS = [
  ["mixed", "Everyone"],
  ["female", "Women only"],
  ["male", "Men only"],
] as const;
export const LANGUAGE_OPTIONS = ["English", "Spanish", "French", "Italian", "German", "Portuguese"] as const;
export const CURRENCY_OPTIONS = ["USD", "EUR", "GBP", "CAD", "AUD"] as const;
export const PRICE_UNIT_OPTIONS = [
  ["per_person", "Per person"],
  ["per_person_sharing", "Per person, sharing a room"],
] as const;
export const INCLUSION_OPTIONS = [
  "accommodation",
  "meals",
  "daily coaching",
  "airport transfers",
  "court fees",
  "video analysis",
  "match play",
  "gym access",
] as const;
export const SURFACE_OPTIONS = ["Hard", "Clay", "Grass", "Artificial Turf", "Carpet"] as const;
export const RATIO_OPTIONS = ["1:1", "2:1", "3:1", "4:1", "5:1", "6:1", "8:1+"] as const;
export const ACCOMMODATION_OPTIONS = [
  ["on_site_resort", "At the resort where you play"],
  ["partner_hotel", "At a partner hotel"],
  ["villa", "In a villa"],
  ["self_arranged", "Players arrange their own"],
  ["not_included", "Not included"],
] as const;

export const MAX_PHOTOS = 5;
// Photos are shrunk in the browser (longest side PHOTO_MAX_PX, JPEG) before upload. The whole
// request has to stay under Vercel's 4.5 MB body limit, so each photo is capped and so is the total.
export const PHOTO_MAX_PX = 1600;
export const PHOTO_MAX_BYTES = 800 * 1024;
export const PHOTOS_MAX_TOTAL_BYTES = 3.5 * 1024 * 1024;
export const MAX_SESSIONS = 30;
