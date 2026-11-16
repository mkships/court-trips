"use client";

import { useState } from "react";
import { Hero } from "@/components/Hero";
import { SearchBar } from "@/components/SearchBar";
import type { Listing, Sport, SportStats } from "@/lib/sports";
import { featuredTiles } from "@/lib/tiles";

// The top of the home page: pick a sport, see its featured trips, search its trips.
export function HomeHero({ stats, listings }: { stats: Record<Sport, SportStats>; listings: Listing[] }) {
  const [sport, setSport] = useState<Sport>("tennis");
  const forSport = listings.filter((l) => l.sports.includes(sport));
  return (
    <>
      <Hero sport={sport} onSportChange={setSport} stats={stats[sport]} featured={featuredTiles(forSport)} />
      <SearchBar key={sport} mode="programs" sport={sport} tiles={forSport} venues={[]} />
    </>
  );
}
