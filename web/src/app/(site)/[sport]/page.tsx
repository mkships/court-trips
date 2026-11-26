import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LandingPage, findLanding, landingMetadata } from "@/components/Landing";
import { SPORTS } from "@/lib/sports";

// A sport's own page: /tennis, /pickleball, /padel (src/lib/landing.ts). Any other word here is a 404.
type Props = { params: Promise<{ sport: string }> };

export const revalidate = 3600;

export const generateStaticParams = () => SPORTS.map((sport) => ({ sport }));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = await findLanding(`/${(await params).sport}`);
  return page ? landingMetadata(page) : {};
}

export default async function SportPage({ params }: Props) {
  const page = await findLanding(`/${(await params).sport}`);
  if (!page) notFound();
  return <LandingPage page={page} />;
}
