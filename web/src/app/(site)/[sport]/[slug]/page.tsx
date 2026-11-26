import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LandingPage, findLanding, landingMetadata } from "@/components/Landing";
import { getHomeData } from "@/lib/db";
import { landingHref, landingPages } from "@/lib/landing";

// A sport's format or country: /pickleball/camps, /padel/spain (src/lib/landing.ts). Built for the
// pairs with enough trips today; one that reaches the minimum later appears within the hour, and
// anything else is a 404.
type Props = { params: Promise<{ sport: string; slug: string }> };

export const revalidate = 3600;

export async function generateStaticParams() {
  const { listings } = await getHomeData();
  return landingPages(listings)
    .filter((page) => page.kind === "format" || page.kind === "place")
    .map((page) => {
      const [, sport, slug] = landingHref(page).split("/");
      return { sport, slug };
    });
}

const pathOf = async ({ params }: Props) => {
  const { sport, slug } = await params;
  return `/${sport}/${slug}`;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  const page = await findLanding(await pathOf(props));
  return page ? landingMetadata(page) : {};
}

export default async function SportDetailPage(props: Props) {
  const page = await findLanding(await pathOf(props));
  if (!page) notFound();
  return <LandingPage page={page} />;
}
