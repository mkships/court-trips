import type { Metadata } from "next";
import { CONTAINER, Empty, FilterChips, H1_RESULTS, SURFACE_NAMES, SportPills, inCountry, resolveWhere } from "@/components/Browse";
import { TILE_GRID, VenueCard } from "@/components/Cards";
import { SearchBar } from "@/components/SearchBar";
import { getHomeData } from "@/lib/db";
import { matchesVenue, parseSearch, type SearchKey, type SearchValues } from "@/lib/filters";
import { SPORT_NAMES, type Sport } from "@/lib/sports";
import { programCount } from "@/lib/tiles";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export const metadata: Metadata = {
  title: "Resorts & clubs | Court Trips",
  description: "Resorts, hotels, clubs and academies with tennis, pickleball and padel courts, and the coached trips that run at each.",
};

// "3 resorts and clubs with clay tennis courts in Greece"
function heading(n: number, sport: Sport, v: SearchValues) {
  return [
    `${n || "No"} ${n === 1 ? "resort or club" : "resorts and clubs"} with ${v.courts ? `${SURFACE_NAMES[v.courts]} ` : ""}${SPORT_NAMES[sport].toLowerCase()} courts`,
    v.where && inCountry(v.where),
  ]
    .filter(Boolean)
    .join(" ");
}

export default async function ResortsPage({ searchParams }: Props) {
  const { sport, values: all } = parseSearch(await searchParams);
  // only the filters that apply to places
  const values: SearchValues = { where: all.where, courts: all.courts };
  const { listings, venues } = await getHomeData();
  const forSport = venues.filter((v) => v.sports.includes(sport));
  resolveWhere(values, forSport.map((v) => v.country));

  const places = forSport.filter((v) => matchesVenue(v, sport, values));
  const active = (Object.entries(values) as [SearchKey, string | undefined][]).filter((e): e is [SearchKey, string] => !!e[1]);

  return (
    <main className={CONTAINER}>
      <SearchBar key={JSON.stringify([sport, values])} mode="places" sport={sport} tiles={[]} venues={forSport} initial={values} placement="page" />
      <SportPills sport={sport} mode="places" values={values} />
      <h1 className={H1_RESULTS}>{heading(places.length, sport, values)}</h1>
      {places.length > 0 && <p className="mt-2 max-w-[60ch] text-ink-soft">Places with courts on site. Each page shows the coached trips that run there.</p>}
      <FilterChips sport={sport} mode="places" values={values} active={active} />
      {places.length === 0 ? (
        <Empty sport={sport} mode="places" values={values} active={active} />
      ) : (
        <ul className={`mt-8 ${TILE_GRID}`}>
          {places.map((v) => (
            <li key={v.slug}>
              <VenueCard venue={v} sport={sport} trips={programCount(listings.filter((t) => t.venueSlug === v.slug))} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
