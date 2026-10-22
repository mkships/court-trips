import { Landing } from "@/components/Landing";
import { getHomeData } from "@/lib/seed";
import { SPORTS } from "@/lib/sports";

export default async function Home({ searchParams }: { searchParams: Promise<{ type?: string; sport?: string }> }) {
  const { stats, listings, venues } = getHomeData();
  const { type, sport } = await searchParams;
  const mode = type === "places" ? "places" : "programs";
  const initialSport = SPORTS.find((s) => s === sport) ?? "tennis";
  return <Landing stats={stats} listings={listings} venues={venues} initialMode={mode} initialSport={initialSport} />;
}
