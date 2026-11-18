import type { MetadataRoute } from "next";
import { getHomeData, getOperators, programSlugs } from "@/lib/db";
import { siteUrl } from "@/lib/site";
import { SPORTS } from "@/lib/sports";

export const revalidate = 3600;

// Every public page at its canonical address: the listing pages per sport (tennis has no parameter),
// then each trip, resort and operator. The same sources as the pages' own generateStaticParams.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [slugs, { venues }, operators] = await Promise.all([programSlugs(), getHomeData(), getOperators()]);
  const sportPages = (path: string) => SPORTS.map((sport) => (sport === "tennis" ? path : `${path}?sport=${sport}`));
  const paths = [
    "/",
    ...sportPages("/trips"),
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
