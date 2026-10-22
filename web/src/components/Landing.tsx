"use client";

import { useState } from "react";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { ListingRow, VenueRow } from "@/components/ListingRow";
import { SearchBar } from "@/components/SearchBar";
import type { Listing, Mode, Sport, SportStats, Venue } from "@/lib/sports";
import { capPerProgram, featuredTiles } from "@/lib/tiles";

// Homepage rows are teasers: one tile per program keeps them varied. "Show all" lists every date.
const ROW_SIZE = 8;
const ROW_CAP_PER_PROGRAM = 1;

type Props = {
  stats: Record<Sport, SportStats>;
  listings: Listing[];
  venues: Venue[];
  initialMode?: Mode;
  initialSport?: Sport;
};

export function Landing({ stats, listings, venues, initialMode = "programs", initialSport = "tennis" }: Props) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [sport, setSport] = useState<Sport>(initialSport);
  const forSport = listings.filter((l) => l.sports.includes(sport));

  return (
    <div className="on-paper">
      <Header mode={mode} onModeChange={setMode} />
      <main className="mx-auto max-w-[1280px] px-4 pb-20 sm:px-8">
        <Hero
          mode={mode}
          sport={sport}
          onSportChange={setSport}
          stats={stats[sport]}
          featured={featuredTiles(forSport)}
        />
        <SearchBar
          key={`${mode}-${sport}`}
          mode={mode}
          sport={sport}
          tiles={forSport}
          venues={venues.filter((v) => v.sports.includes(sport))}
        />
        {mode === "programs" ? (
          <ListingRow sport={sport} total={stats[sport].tiles} listings={capPerProgram(forSport, ROW_CAP_PER_PROGRAM).slice(0, ROW_SIZE)} />
        ) : (
          <VenueRow sport={sport} venues={venues.filter((v) => v.sports.includes(sport))} programs={forSport} />
        )}
      </main>
      <Footer />
    </div>
  );
}
