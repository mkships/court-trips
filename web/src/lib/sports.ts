export type Sport = "tennis" | "pickleball" | "padel";
export const SPORTS: Sport[] = ["tennis", "pickleball", "padel"];

export type SportStats = {
  programs: number;
  // one tile per upcoming session, plus one per undated program
  tiles: number;
  countries: string[];
  // "YYYY-MM" months that still have a session starting in them
  months: string[];
};

export const SPORT_NAMES: Record<Sport, string> = {
  tennis: "Tennis",
  pickleball: "Pickleball",
  padel: "Padel",
};

export type Mode = "programs" | "places";

export type Level = "beginner" | "intermediate" | "advanced" | "all levels";

// One tile (src/lib/db.ts): a program on one upcoming set of dates, or an undated program
export type Listing = {
  // programSlug@start_date, unique per tile
  key: string;
  programSlug: string;
  sports: string[];
  category: "camp" | "clinic" | "social_getaway";
  level: Level[];
  title: string;
  organizer: string | null;
  place: string | null;
  country: string | null;
  start: string | null;
  end: string | null;
  status: "available" | "waitlist" | "sold_out" | null;
  scheduleNotes: string | null;
  priceFrom: number | null;
  currency: string | null;
  priceUnit: "per_person" | "per_person_sharing" | null;
  // may be empty: some operators publish no usable photos
  photos: string[];
  venueSlug: string | null;
  // position in the hero carousel for its sport; null when not featured
  featuredRank: number | null;
  bookingUrl: string;
};

export type Venue = {
  slug: string;
  name: string;
  kind: "resort" | "hotel" | "club" | "academy";
  sports: string[];
  place: string | null;
  country: string | null;
  courts: { sport: string; count: number | null; surface: string | null; indoor: boolean }[];
  programSlugs: string[];
  photos: string[];
  website: string;
};

// Full record for one program page (src/lib/db.ts getProgram)
export type ProgramDetail = {
  slug: string;
  title: string;
  organizer: string;
  // the operator's page (/operators/slug); null when it has none
  operatorSlug: string | null;
  // the marketplace it's booked through, when it can't be booked with the operator directly
  soldThrough: string | null;
  description: string;
  coaches: string[];
  languages: string[];
  sports: string[];
  category: Listing["category"];
  level: Level[];
  theme: string[];
  gender: "male" | "female" | "mixed" | null;
  ratings: { dupr_min?: number; dupr_max?: number; utr_min?: number; utr_max?: number; ntrp_min?: number; ntrp_max?: number };
  place: string | null;
  country: string | null;
  venueName: string | null;
  venueSlug: string | null;
  sessions: { start: string; end: string; status: NonNullable<Listing["status"]>; price: number | null; bookingUrl: string | null }[];
  scheduleNotes: string | null;
  priceMin: number | null;
  priceMax: number | null;
  currency: string | null;
  priceUnit: Listing["priceUnit"];
  priceNotes: string | null;
  inclusions: string[];
  surfaces: string[];
  coachingHours: number | null;
  ratio: string | null;
  capacity: number | null;
  accommodation: "on_site_resort" | "partner_hotel" | "villa" | "self_arranged" | "not_included" | null;
  photos: string[];
  bookingUrl: string;
  sourceUrl: string;
  checkedAt: string;
};

// An operator with at least one public listing (src/lib/db.ts getOperators)
export type Operator = {
  slug: string;
  name: string;
  description: string | null;
  website: string | null;
  programSlugs: string[];
};
