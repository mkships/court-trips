import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LandingPage, findLanding, landingMetadata } from "@/components/Landing";
import { getHomeData } from "@/lib/db";
import { landingHref, landingPages } from "@/lib/landing";

// A country across all three sports: /destinations/spain (src/lib/landing.ts).
type Props = { params: Promise<{ country: string }> };

export const revalidate = 3600;

export async function generateStaticParams() {
  const { listings } = await getHomeData();
  return landingPages(listings)
    .filter((page) => page.kind === "destination")
    .map((page) => ({ country: landingHref(page).split("/")[2] }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = await findLanding(`/destinations/${(await params).country}`);
  return page ? landingMetadata(page) : {};
}

export default async function DestinationPage({ params }: Props) {
  const page = await findLanding(`/destinations/${(await params).country}`);
  if (!page) notFound();
  return <LandingPage page={page} />;
}
