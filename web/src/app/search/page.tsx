import type { Metadata } from "next";
import Link from "next/link";
import { Court } from "@/components/Court";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { ListingCard, VenueCard } from "@/components/ListingRow";
import { SearchBar } from "@/components/SearchBar";
import { matchesTile, matchesVenue, parseSearch, searchHref, type SearchKey, type SearchValues } from "@/lib/filters";
import { getHomeData } from "@/lib/seed";
import { SPORTS, SPORT_NAMES, type Sport } from "@/lib/sports";
import { SURFACES } from "@/lib/surfaces";
import { programCount } from "@/lib/tiles";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export const metadata: Metadata = { title: "Search | Court Trips" };

const FORMAT_NOUNS: Record<string, [string, string]> = {
  camp: ["camp", "camps"],
  clinic: ["clinic", "clinics"],
  social_getaway: ["getaway", "getaways"],
};
const LEVEL_PHRASES: Record<string, string> = {
  beginner: "for beginners",
  intermediate: "for intermediate players",
  advanced: "for advanced players",
};
const SURFACE_NAMES: Record<string, string> = { Hard: "hard", Clay: "clay", Grass: "grass", "Artificial Turf": "artificial turf" };

// "in the United States", "in Greece"
const THE = /^(United |Dominican Republic|Czech Republic|Netherlands|Turks and Caicos|Bahamas|Philippines|Maldives)/;
const inCountry = (c: string) => `in ${THE.test(c) ? "the " : ""}${c}`;

const monthLabel = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
};

// Short labels for the removable filter chips.
function chipLabel(key: SearchKey, value: string) {
  if (key === "month") return monthLabel(value);
  if (key === "format") return FORMAT_NOUNS[value]?.[0].replace(/^./, (c) => c.toUpperCase()) ?? value;
  if (key === "level") return value[0].toUpperCase() + value.slice(1);
  if (key === "guests") return `${value} ${value === "1" ? "guest" : "guests"}`;
  if (key === "courts") return `${SURFACE_NAMES[value] ?? value} courts`.replace(/^./, (c) => c.toUpperCase());
  return value;
}

// "2 tennis getaways in Greece in May 2027 for advanced players"
function programsHeading(n: number, sport: Sport, v: SearchValues) {
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

function placesHeading(n: number, sport: Sport, v: SearchValues) {
  return [
    `${n || "No"} ${n === 1 ? "place" : "places"} to stay with ${v.courts ? `${SURFACE_NAMES[v.courts]} ` : ""}${SPORT_NAMES[sport].toLowerCase()} courts`,
    v.where && inCountry(v.where),
  ]
    .filter(Boolean)
    .join(" ");
}

export default async function SearchPage({ searchParams }: Props) {
  const { sport, mode, values } = parseSearch(await searchParams);
  const { listings, venues } = getHomeData();
  const forSport = listings.filter((l) => l.sports.includes(sport));
  const venuesForSport = venues.filter((v) => v.sports.includes(sport));

  // a typed place ("gree") that matches exactly one country reads as that country
  if (values.where) {
    const typed = values.where.toLowerCase();
    const known = [...new Set([...forSport.map((l) => l.country), ...venuesForSport.map((v) => v.country)])];
    const hits = known.filter((c): c is string => !!c?.toLowerCase().includes(typed));
    if (hits.length === 1) values.where = hits[0];
  }

  // every date is its own tile; listings arrive soonest first
  const tiles = forSport.filter((t) => matchesTile(t, values));
  const places = venuesForSport.filter((v) => matchesVenue(v, sport, values));
  const programs = programCount(tiles);
  const count = mode === "programs" ? programs : places.length;
  const active = (Object.entries(values) as [SearchKey, string][]).filter(([k]) => mode === "places" || !["guests", "courts"].includes(k));

  return (
    <div className="on-paper">
      <Header mode={mode} />
      <main className="mx-auto max-w-[1280px] px-4 sm:px-8">
        <SearchBar
          key={JSON.stringify([sport, mode, values])}
          mode={mode}
          sport={sport}
          tiles={forSport}
          venues={venuesForSport}
          initial={values}
          placement="page"
        />

        <nav aria-label="Sport" className="mt-8 flex flex-wrap gap-2">
          {SPORTS.map((s) => (
            <Link
              key={s}
              href={searchHref(s, mode, values)}
              aria-current={s === sport ? "page" : undefined}
              className="rounded-full border border-rule px-4 py-1.5 text-[0.9375rem] font-semibold hover:border-ink aria-[current=page]:border-ink aria-[current=page]:bg-ink aria-[current=page]:text-white"
            >
              {SPORT_NAMES[s]}
            </Link>
          ))}
        </nav>

        <h1 className="mt-6 max-w-[30ch] text-[1.875rem] leading-[1.1] font-extrabold tracking-[-0.025em] text-balance sm:text-[2.25rem]">
          {mode === "programs" ? programsHeading(count, sport, values) : placesHeading(count, sport, values)}
        </h1>
        {mode === "programs" && count > 0 && (
          <p className="mt-2 text-ink-soft">
            {tiles.length} {tiles.length === 1 ? "date" : "dates"}, soonest first.
          </p>
        )}

        {active.length > 0 && (
          <ul className="mt-5 flex flex-wrap gap-2" aria-label="Active filters">
            {active.map(([key, value]) => (
              <li key={key}>
                <Link
                  href={searchHref(sport, mode, values, key)}
                  aria-label={`Remove filter: ${chipLabel(key, value)}`}
                  className="inline-flex items-center gap-2 rounded-full bg-mist py-1.5 pr-2.5 pl-3.5 text-[0.875rem] font-semibold hover:bg-rule"
                >
                  {chipLabel(key, value)}
                  <svg viewBox="0 0 12 12" className="size-2.5" aria-hidden="true">
                    <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </Link>
              </li>
            ))}
            {active.length > 1 && (
              <li>
                <Link href={searchHref(sport, mode, {})} className="inline-block py-1.5 text-[0.875rem] font-semibold underline underline-offset-4">
                  Clear all
                </Link>
              </li>
            )}
          </ul>
        )}

        {count === 0 ? (
          <Empty sport={sport} mode={mode} values={values} active={active} />
        ) : (
          <ul className="mt-8 grid grid-cols-1 gap-x-6 gap-y-9 sm:grid-cols-2 lg:grid-cols-4">
            {mode === "programs"
              ? tiles.map((t) => (
                  <li key={t.key}>
                    <ListingCard listing={t} sport={sport} />
                  </li>
                ))
              : places.map((v) => (
                  <li key={v.slug}>
                    <VenueCard venue={v} sport={sport} programs={programCount(forSport.filter((t) => t.venueSlug === v.slug))} />
                  </li>
                ))}
          </ul>
        )}
      </main>
      <Footer />
    </div>
  );
}

function Empty(props: { sport: Sport; mode: "programs" | "places"; values: SearchValues; active: [SearchKey, string][] }) {
  const { sport, mode, values, active } = props;
  return (
    <section className="mt-8 grid items-center gap-8 rounded-[28px] bg-mist p-6 sm:p-10 md:grid-cols-[1fr_280px]">
      <div>
        <p className="text-[1.25rem] font-extrabold">Nothing matches all of those filters.</p>
        {active.length > 0 ? (
          <>
            <p className="mt-2 max-w-[50ch] text-ink-soft">Remove one to see more:</p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {active.map(([key, value]) => (
                <li key={key}>
                  <Link
                    href={searchHref(sport, mode, values, key)}
                    className="inline-block rounded-full border border-ink/20 bg-white px-4 py-2 text-[0.9375rem] font-semibold hover:border-ink"
                  >
                    Without {key === "where" ? value : chipLabel(key, value).toLowerCase()}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="mt-2 text-ink-soft">There are no {SPORT_NAMES[sport].toLowerCase()} listings yet. Try another sport.</p>
        )}
      </div>
      <div className="hidden rounded-2xl p-5 md:block" style={{ backgroundColor: SURFACES[sport].surround }}>
        <Court sport={sport} className="block aspect-[28/15] w-full" />
      </div>
    </section>
  );
}
