import seed from "@/data/seed.json";
import { photoUrl } from "@/lib/photos";
import type { SeedData } from "@/lib/sports";

// Server-side access to the seed. Import only from server components and route handlers,
// so program details stay out of client bundles.
const raw = seed as SeedData;

// resolve photo paths once, so every page gets URLs that work where it's deployed
const withUrls = <T extends { photos: string[] }>(record: T): T => ({ ...record, photos: record.photos.map(photoUrl) });

const data: SeedData = {
  stats: raw.stats,
  listings: raw.listings.map(withUrls),
  venues: raw.venues.map(withUrls),
  programs: Object.fromEntries(Object.entries(raw.programs).map(([slug, p]) => [slug, withUrls(p)])),
};

export const getProgram = (slug: string) => data.programs[slug] ?? null;
export const getVenue = (slug: string) => data.venues.find((v) => v.slug === slug) ?? null;
export const programSlugs = () => Object.keys(data.programs);
export const getHomeData = () => ({ stats: data.stats, listings: data.listings, venues: data.venues });
