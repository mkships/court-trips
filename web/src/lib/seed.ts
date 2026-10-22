import seed from "@/data/seed.json";
import type { SeedData } from "@/lib/sports";

// Server-side access to the seed. Import only from server components and route handlers,
// so program details stay out of client bundles.
const data = seed as SeedData;

export const getProgram = (slug: string) => data.programs[slug] ?? null;
export const getVenue = (slug: string) => data.venues.find((v) => v.slug === slug) ?? null;
export const programSlugs = () => Object.keys(data.programs);
export const getHomeData = () => ({ stats: data.stats, listings: data.listings, venues: data.venues });
