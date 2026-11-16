import type { Metadata } from "next";
import { CONTAINER, Empty, FORMAT_NOUNS, FilterChips, H1_RESULTS, SportPills, inCountry, monthLabel, resolveWhere } from "@/components/Browse";
import { TILE_GRID, TripCard } from "@/components/Cards";
import { SearchBar } from "@/components/SearchBar";
import { getHomeData } from "@/lib/db";
import { matchesTile, parseSearch, type SearchKey, type SearchValues } from "@/lib/filters";
import { SPORT_NAMES, type Sport } from "@/lib/sports";
import { groupTrips } from "@/lib/tiles";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export const metadata: Metadata = {
  title: "Trips | Court Trips",
  description: "Tennis, pickleball and padel camps, clinics and getaways. Filter by country, month, level and format.",
};

const LEVEL_PHRASES: Record<string, string> = {
  beginner: "for beginners",
  intermediate: "for intermediate players",
  advanced: "for advanced players",
};

// "2 tennis getaways in Greece in May 2027 for advanced players"
function heading(n: number, sport: Sport, v: SearchValues) {
  const [one, many] = (v.format && FORMAT_NOUNS[v.format]) || ["trip", "trips"];
  return [
    `${n || "No"} ${SPORT_NAMES[sport].toLowerCase()} ${n === 1 ? one : many}`,
    v.where && inCountry(v.where),
    v.month && `in ${monthLabel(v.month)}`,
    v.level && LEVEL_PHRASES[v.level],
  ]
    .filter(Boolean)
    .join(" ");
}

// The trips are the headline number; departures and countries say how much is behind them.
// "68 departures across 9 countries, soonest first."
function summary(departures: number, countries: number) {
  const parts = [];
  if (departures > 0) parts.push(`${departures} ${departures === 1 ? "departure" : "departures"}`);
  if (countries > 1) parts.push(`${parts.length ? "across" : "Across"} ${countries} countries`);
  return parts.length ? `${parts.join(" ")}, soonest first.` : "Soonest first.";
}

export default async function TripsPage({ searchParams }: Props) {
  const { sport, values } = parseSearch(await searchParams);
  const { listings } = await getHomeData();
  const forSport = listings.filter((l) => l.sports.includes(sport));
  resolveWhere(values, forSport.map((l) => l.country));

  // filter the dates, then show each trip once with the dates that passed
  const tiles = forSport.filter((t) => matchesTile(t, values));
  const trips = groupTrips(tiles);
  const departures = tiles.filter((t) => t.start).length;
  const countries = new Set(tiles.map((t) => t.country).filter(Boolean)).size;
  const active = (Object.entries(values) as [SearchKey, string][]).filter(([k]) => k !== "courts");

  return (
    <main className={CONTAINER}>
      <SearchBar key={JSON.stringify([sport, values])} mode="programs" sport={sport} tiles={forSport} venues={[]} initial={values} placement="page" />
      <SportPills sport={sport} mode="programs" values={values} />
      <h1 className={H1_RESULTS}>{heading(trips.length, sport, values)}</h1>
      {trips.length > 0 && <p className="mt-2 text-ink-soft">{summary(departures, countries)}</p>}
      <FilterChips sport={sport} mode="programs" values={values} active={active} />
      {trips.length === 0 ? (
        <Empty sport={sport} mode="programs" values={values} active={active} />
      ) : (
        <ul className={`mt-8 ${TILE_GRID}`}>
          {trips.map((trip) => (
            <li key={trip.programSlug}>
              <TripCard trip={trip} sport={sport} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
