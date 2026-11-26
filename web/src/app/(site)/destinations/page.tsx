import type { Metadata } from "next";
import Link from "next/link";
import { CONTAINER, H1 } from "@/components/Browse";
import { CountryFlag } from "@/components/CountryFlag";
import { JsonLd } from "@/components/JsonLd";
import { Crumbs } from "@/components/Landing";
import { continentOf, countryLabel, type Continent } from "@/lib/country-info";
import { getHomeData } from "@/lib/db";
import { searchHref } from "@/lib/filters";
import { breadcrumbs } from "@/lib/jsonld";
import { landingAt, landingHref, sportsIn } from "@/lib/landing";
import { SPORT_NAMES, type Listing } from "@/lib/sports";
import { programCount } from "@/lib/tiles";

export const metadata: Metadata = {
  title: "Destinations for tennis, pickleball and padel trips | Court Trips",
  description: "Every country with a coached tennis, pickleball or padel trip on Court Trips, by continent, with how many trips each has.",
  alternates: { canonical: "/destinations" },
};

export const revalidate = 3600;

const CRUMBS = [
  { name: "Home", href: "/" },
  { name: "Destinations", href: "/destinations" },
];
// most trips first
const CONTINENT_ORDER: Continent[] = ["Europe", "North America", "Asia", "South America", "Africa", "Oceania", "Antarctica"];

// Every country with a trip, by continent. A country with enough trips has its own page
// (src/lib/landing.ts); the others open the search for the sport they have most of.
export default async function DestinationsPage() {
  const { listings } = await getHomeData();
  const byCountry = new Map<string, Listing[]>();
  for (const t of listings) if (t.country) byCountry.set(t.country, [...(byCountry.get(t.country) ?? []), t]);
  const countries = [...byCountry]
    .map(([country, tiles]) => {
      const sports = sportsIn(tiles)
        .map((sport) => ({ sport, trips: programCount(tiles.filter((t) => t.sports.includes(sport))) }))
        .sort((a, b) => b.trips - a.trips);
      const hub = landingAt(landingHref({ kind: "destination", country }), listings);
      return {
        country,
        sports,
        trips: programCount(tiles),
        href: hub ? landingHref(hub) : searchHref(sports[0].sport, "programs", { where: country }),
        continent: continentOf(country),
      };
    })
    .sort((a, b) => b.trips - a.trips || a.country.localeCompare(b.country));
  const continents = CONTINENT_ORDER.map((continent) => ({ continent, countries: countries.filter((c) => c.continent === continent) })).filter(
    (c) => c.countries.length > 0,
  );

  return (
    <main className={CONTAINER}>
      <JsonLd data={breadcrumbs(CRUMBS)} />
      <Crumbs crumbs={CRUMBS} />
      <h1 className={`mt-4 ${H1}`}>Destinations</h1>
      <p className="mt-5 max-w-[60ch] text-[1.0625rem] leading-relaxed text-ink-soft">
        Coached tennis, pickleball and padel trips in {countries.length} countries. Pick a country to see what runs there.
      </p>
      {continents.map(({ continent, countries: list }) => (
        <section key={continent} aria-labelledby={`in-${continent}`} className="mt-12">
          <h2 id={`in-${continent}`} className="text-[1.375rem] font-extrabold tracking-[-0.02em]">
            {continent}
          </h2>
          <ul className="mt-4 grid gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((c) => (
                <li key={c.country}>
                  <Link href={c.href} className="group -mx-3 flex items-center gap-4 rounded-2xl px-3 py-2.5 transition-colors hover:bg-mist">
                    <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-mist transition-colors group-hover:bg-white" aria-hidden="true">
                      <CountryFlag country={c.country} />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-semibold">{countryLabel(c.country)}</span>
                      <span className="block truncate text-[0.875rem] text-ink-soft">
                        {c.sports.map((s) => `${s.trips} ${SPORT_NAMES[s.sport].toLowerCase()}`).join(" · ")}
                      </span>
                    </span>
                  </Link>
                </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
