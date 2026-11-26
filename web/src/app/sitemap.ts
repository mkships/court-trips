import type { MetadataRoute } from "next";
import { getHomeData, getOperators, programSlugs } from "@/lib/db";
import { landingHref, landingPages } from "@/lib/landing";
import { siteUrl } from "@/lib/site";
import { SPORTS } from "@/lib/sports";

export const revalidate = 3600;

// Every public page at its canonical address: the landing pages (each sport, its formats and
// countries, and the country hubs: src/lib/landing.ts), the resort lists per sport (tennis has no
// parameter), then each trip, resort and operator. /trips is the search, and names a landing page as
// its canonical, so it isn't listed. The same sources as the pages' own generateStaticParams.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [slugs, { venues, listings }, operators] = await Promise.all([programSlugs(), getHomeData(), getOperators()]);
  const sportPages = (path: string) => SPORTS.map((sport) => (sport === "tennis" ? path : `${path}?sport=${sport}`));
  const paths = [
    "/",
    ...landingPages(listings).map(landingHref),
    "/destinations",
    ...sportPages("/resorts"),
    "/operators",
    "/for-operators",
    "/list-your-program",
    "/newsletter",
    ...slugs.map((slug) => `/programs/${slug}`),
    ...venues.map((venue) => `/resorts/${venue.slug}`),
    ...operators.map((operator) => `/operators/${operator.slug}`),
  ];
  const base = siteUrl();
  return paths.map((path) => ({ url: new URL(path, base).toString() }));
}
