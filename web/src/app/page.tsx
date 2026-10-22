import { Landing } from "@/components/Landing";
import { getHomeData } from "@/lib/seed";

export default async function Home({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { stats, listings, venues } = getHomeData();
  const mode = (await searchParams).type === "places" ? "places" : "programs";
  return <Landing stats={stats} listings={listings} venues={venues} initialMode={mode} />;
}
