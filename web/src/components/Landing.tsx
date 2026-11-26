import type { Metadata } from "next";
import Link from "next/link";
import { CONTAINER, H1 } from "@/components/Browse";
import { OperatorCard, TILE_GRID, TripCard, VenueCard } from "@/components/Cards";
import { CAROUSEL_ITEM, Carousel } from "@/components/Carousel";
import { Money } from "@/components/Currency";
import { JsonLd } from "@/components/JsonLd";
import { LinkIcon } from "@/components/LinkIcon";
import { BookDirectIcon, CompareIcon, FindIcon, PeopleIcon, TicketIcon } from "@/components/icons";
import { INTROS } from "@/content/landing";
import { countryLabel, inCountry } from "@/lib/country-info";
import { getRates } from "@/lib/currency";
import { getHomeData, getOperators } from "@/lib/db";
import { searchHref } from "@/lib/filters";
import { PRICE_UNIT_NAMES } from "@/lib/format";
import { breadcrumbs, itemList, type Crumb } from "@/lib/jsonld";
import {
  FORMATS,
  FORMAT_LABELS,
  factsFor,
  landingAt,
  landingHeading,
  landingHref,
  landingNoun,
  landingPages,
  some,
  sportsIn,
  tilesFor,
  type Facts,
  type Landing,
  type MenuLink,
} from "@/lib/landing";
import { SPORT_NAMES, type Listing, type Sport, type Trip } from "@/lib/sports";
import { groupTrips, programCount } from "@/lib/tiles";
import { LINK, LINK_QUIET, PILL } from "@/lib/ui";

// The landing pages (src/lib/landing.ts): what a visitor from a search sees for "padel holidays in
// Spain" or "pickleball camps". One template for all four kinds, so each has the same parts in the
// same order: where you are, what these trips are, what's listed right now, the trips, where to go
// next, and the questions people ask.

// a row of cards stops before it becomes a list; the page it links to has the rest
const ROW_MAX = 12;

const shortMonth = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
};
const monthName = (mm: string) => new Date(Date.UTC(2000, Number(mm) - 1, 1)).toLocaleDateString("en-GB", { month: "long", timeZone: "UTC" });
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

// Home > Padel > Spain. The last one is the page itself.
export function crumbsFor(page: Landing): Crumb[] {
  const home = { name: "Home", href: "/" };
  if (page.kind === "destination")
    return [home, { name: "Destinations", href: "/destinations" }, { name: countryLabel(page.country), href: landingHref(page) }];
  const sport = { name: SPORT_NAMES[page.sport], href: `/${page.sport}` };
  if (page.kind === "sport") return [home, sport];
  return [home, sport, { name: page.kind === "format" ? FORMAT_LABELS[page.format] : countryLabel(page.country), href: landingHref(page) }];
}

// `trail` is for a page whose own name is its heading (a trip): every crumb is a link back up.
export function Crumbs({ crumbs, trail = false }: { crumbs: Crumb[]; trail?: boolean }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.9375rem]">
        {crumbs.map((c, i) => (
          <li key={c.href} className="flex items-center gap-2">
            {i > 0 && (
              <span aria-hidden="true" className="text-ink-soft/60">
                /
              </span>
            )}
            {trail || i < crumbs.length - 1 ? (
              <Link href={c.href} className={LINK_QUIET}>
                {c.name}
              </Link>
            ) : (
              <span aria-current="page" className="font-semibold">
                {c.name}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

// What's listed right now, as a sentence: where the trips are and who runs them.
function liveLine(page: Landing, facts: Facts) {
  const operators = some(facts.operators, 3, ["other operator", "other operators"]);
  if (page.kind === "sport" || page.kind === "format")
    return `The trips listed here are ${facts.countries.length === 1 ? inCountry(facts.countries[0]) : `in ${facts.countries.length} countries`}, from ${operators}.`;
  return `The trips listed here are based in ${some(facts.places, 4, ["other place", "other places"])}, and run by ${operators}.`;
}

type IconType = (props: { className?: string }) => React.ReactNode;
type BarFact = { icon: IconType; label: string; value: React.ReactNode; wide?: boolean };

// What's listed right now, as one bar that takes only the width its facts need: each fact has its
// icon beside its number, the same padding all round, and a hairline before the next. The values run
// from "3" to a range of months, and the lines and even padding are what make that look deliberate.
// It stays white so the icons keep their ink and yellow.
// A tablet has no room for one row, so the bar is two by two, still only as wide as its facts. On a
// phone it is full width: the two counts share a row, and the price and the dates (the long ones)
// take a row each.
function FactBar({ facts }: { facts: Facts }) {
  const { cheapest, firstMonth, lastMonth } = facts;
  const items: BarFact[] = [
    { icon: FindIcon, label: facts.trips === 1 ? "trip" : "trips", value: facts.trips },
    { icon: BookDirectIcon, label: facts.operators.length === 1 ? "operator" : "operators", value: facts.operators.length },
  ];
  if (cheapest)
    items.push({
      icon: TicketIcon,
      label: `lowest price${cheapest.unit ? `, ${PRICE_UNIT_NAMES[cheapest.unit]}` : ""}`,
      value: <Money amount={cheapest.amount} currency={cheapest.currency} />,
      wide: true,
    });
  if (firstMonth && lastMonth)
    items.push({
      icon: CompareIcon,
      label: "trip dates",
      value: firstMonth === lastMonth ? shortMonth(firstMonth) : `${shortMonth(firstMonth)} to ${shortMonth(lastMonth)}`,
      wide: true,
    });
  return (
    // the hairlines are the gaps: one pixel of the rule colour showing between white cells
    <dl
      aria-label="What's listed"
      className="mt-7 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-rule ring-1 ring-rule sm:w-fit sm:grid-cols-[auto_auto] lg:flex"
    >
      {items.map(({ icon: Icon, label, value, wide }, i) => (
        <div
          key={label}
          className={`grid grid-cols-[auto_1fr] items-center gap-x-3 bg-white px-4 py-3.5 sm:px-5 ${wide ? "max-sm:col-span-2" : ""} ${
            // an odd fact out fills its row, so the bar never shows an empty cell
            items.length % 2 === 1 && i === items.length - 1 ? "sm:max-lg:col-span-2" : ""
          }`}
        >
          <Icon className="col-start-1 row-span-2 row-start-1 size-7" />
          <dt className="col-start-2 row-start-2 text-[0.875rem] text-ink-soft">{label}</dt>
          <dd className="col-start-2 row-start-1 text-[1.125rem] leading-tight font-extrabold tracking-[-0.02em] whitespace-nowrap tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

type PillLink = MenuLink;

function Pills({ title, links }: { title: string; links: PillLink[] }) {
  if (links.length === 0) return null;
  return (
    <nav aria-label={title} className="mt-8">
      <h2 className="text-[0.8125rem] font-extrabold">{title}</h2>
      <ul className="mt-2.5 flex flex-wrap gap-2">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className={`px-4 py-1.5 text-[0.9375rem] ${PILL}`}>
              <LinkIcon {...l} />
              {l.label}
              {l.count != null && <span className="font-normal text-ink-soft tabular-nums">{l.count}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mt-12 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
      <h2 className="text-[1.375rem] font-extrabold tracking-[-0.02em]">{children}</h2>
      {action}
    </div>
  );
}

function TripGrid({ trips, sport }: { trips: Trip[]; sport?: Sport }) {
  return (
    <ul className={`mt-6 ${TILE_GRID}`}>
      {trips.map((trip) => (
        <li key={trip.programSlug}>
          <TripCard trip={trip} sport={sport ?? (trip.sports[0] as Sport)} />
        </li>
      ))}
    </ul>
  );
}

// The questions people ask before booking, answered from what's listed. A question the listings
// can't answer (no prices, no dates) is left out.
function GoodToKnow({ page, facts }: { page: Landing; facts: Facts }) {
  const noun = landingNoun(page);
  const { cheapest, firstMonth, lastMonth, busiest, beginners, trips } = facts;
  return (
    <section aria-labelledby="good-to-know" className="mt-14 max-w-[70ch]">
      <h2 id="good-to-know" className="text-[1.375rem] font-extrabold tracking-[-0.02em]">
        Good to know
      </h2>
      <dl className="mt-5 divide-y divide-rule border-y border-rule">
        {cheapest && (
          <Question icon={TicketIcon} q={`How much does a ${noun} cost?`}>
            The {trips === 1 ? "trip" : `${trips} trips`} listed here start from <Money amount={cheapest.amount} currency={cheapest.currency} />
            {cheapest.unit ? ` ${PRICE_UNIT_NAMES[cheapest.unit]}` : ""}. What a price covers varies: some include the hotel and meals, others are
            coaching only, so check what&apos;s included on each trip.
          </Question>
        )}
        {firstMonth && lastMonth && (
          <Question icon={CompareIcon} q="When do they run?">
            {firstMonth === lastMonth
              ? `The dates listed are in ${shortMonth(firstMonth)}.`
              : `The dates listed run from ${shortMonth(firstMonth)} to ${shortMonth(lastMonth)}.`}
            {busiest.length === 2 && ` Most trips start in ${monthName(busiest[0])} and ${monthName(busiest[1])}.`} New dates are added as
            operators publish them.
          </Question>
        )}
        <Question icon={PeopleIcon} q="How good do I need to be?">
          {beginners === trips
            ? `Every trip listed here takes beginners or all levels.`
            : beginners === 0
              ? `The trips listed here are for intermediate and advanced players.`
              : `${beginners} of the ${trips} trips take beginners or all levels; the rest are for intermediate or advanced players.`}{" "}
          Each trip shows its level, and its page has the rating range where the operator gives one.
        </Question>
        <Question icon={BookDirectIcon} q="How do I book?">
          With the operator. Every trip links to the operator&apos;s own booking page, where you book and pay. Court Trips charges nothing and
          takes no commission.
        </Question>
      </dl>
    </section>
  );
}

function Question({ icon: Icon, q, children }: { icon: IconType; q: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[auto_1fr] gap-x-3.5 py-4">
      <Icon className="row-span-2 mt-0.5 size-6" />
      <dt className="text-[1.0625rem] font-extrabold tracking-[-0.01em]">{q}</dt>
      <dd className="col-start-2 mt-1.5 leading-relaxed text-ink-soft">{children}</dd>
    </div>
  );
}

// Title, description and canonical address of a landing page.
export async function landingMetadata(page: Landing): Promise<Metadata> {
  const { listings } = await getHomeData();
  const tiles = tilesFor(page, listings);
  const facts = factsFor(tiles, null);
  const heading = landingHeading(page, tiles);
  const title = `${heading} | Court Trips`;
  const description = `${heading}: ${plural(facts.trips, "coached trip")} from ${plural(facts.operators.length, "operator")}, with dates, prices and playing levels checked against each operator's own page. Book direct, with no fees.`;
  return {
    title,
    description,
    alternates: { canonical: landingHref(page) },
    // these are brand pages, so they share the site's illustrated cover; a trip shares its own photo
    openGraph: { title, description, images: ["/opengraph-image"] },
  };
}

export async function LandingPage({ page }: { page: Landing }) {
  const [{ listings, venues }, operators, rates] = await Promise.all([getHomeData(), getOperators(), getRates()]);
  const tiles = tilesFor(page, listings);
  const trips = groupTrips(tiles);
  const facts = factsFor(tiles, rates);
  const heading = landingHeading(page, tiles);
  const crumbs = crumbsFor(page);
  const pages = landingPages(listings);
  const exists = (other: Landing) => pages.some((p) => landingHref(p) === landingHref(other));
  const intro = INTROS[landingHref(page)];

  // who runs these trips, and (for a country) where you can stay and play
  const slugs = new Set(trips.map((t) => t.programSlug));
  const runners = operators.filter((o) => o.programSlugs.some((s) => slugs.has(s)));
  const country = page.kind === "place" || page.kind === "destination" ? page.country : null;
  const stays = country ? venues.filter((v) => v.country === country && (page.kind !== "place" || v.sports.includes(page.sport))) : [];

  return (
    <main className={CONTAINER}>
      <JsonLd data={breadcrumbs(crumbs)} />
      <JsonLd data={itemList(heading, trips.map((t) => ({ name: t.title, href: `/programs/${t.programSlug}` })))} />
      <Crumbs crumbs={crumbs} />
      <h1 className={`mt-4 max-w-[24ch] ${H1}`}>{heading}</h1>
      <p className="mt-5 max-w-[68ch] text-[1.0625rem] leading-relaxed">
        {intro && `${intro} `}
        {liveLine(page, facts)}
      </p>
      <FactBar facts={facts} />

      {page.kind === "sport" && <SportHub page={page} listings={listings} tiles={tiles} exists={exists} />}
      {page.kind === "format" && <FormatPage page={page} listings={listings} trips={trips} exists={exists} />}
      {page.kind === "place" && <PlacePage page={page} listings={listings} trips={trips} pages={pages} />}
      {page.kind === "destination" && <DestinationPage page={page} tiles={tiles} pages={pages} exists={exists} />}

      {stays.length > 0 && country && (
        <Carousel
          title={`Resorts and clubs ${inCountry(country)}`}
          intro="Places with courts on site, and the trips that run there."
          action={
            <Link href="/resorts" className={`text-[0.9375rem] ${LINK}`}>
              All resorts and clubs
            </Link>
          }
        >
          {stays.slice(0, ROW_MAX).map((venue) => (
            <li key={venue.slug} className={CAROUSEL_ITEM}>
              <VenueCard
                venue={venue}
                sport={page.kind === "place" ? page.sport : undefined}
                trips={programCount(listings.filter((t) => t.venueSlug === venue.slug))}
              />
            </li>
          ))}
        </Carousel>
      )}

      {runners.length > 0 && (
        <Carousel
          title="Who runs them"
          intro="The operators behind these trips. You book with them directly."
          action={
            <Link href="/operators" className={`text-[0.9375rem] ${LINK}`}>
              All operators
            </Link>
          }
        >
          {runners.slice(0, ROW_MAX).map((operator) => {
            const mine = new Set(operator.programSlugs);
            return (
              <li key={operator.slug} className={CAROUSEL_ITEM}>
                <OperatorCard operator={operator} tiles={listings.filter((t) => mine.has(t.programSlug))} />
              </li>
            );
          })}
        </Carousel>
      )}

      <GoodToKnow page={page} facts={facts} />
    </main>
  );
}

type Exists = (page: Landing) => boolean;

// every country a sport has trips in: its own page where there is one, else the search
function countryLinks(sport: Sport, listings: Listing[], exists: Exists, skip?: string): PillLink[] {
  const mine = listings.filter((t) => t.sports.includes(sport) && t.country && t.country !== skip);
  return [...new Set(mine.map((t) => t.country!))]
    .map((country) => ({ country, count: programCount(mine.filter((t) => t.country === country)) }))
    .sort((a, b) => b.count - a.count || a.country.localeCompare(b.country))
    .map(({ country, count }) => {
      const page: Landing = { kind: "place", sport, country };
      return { href: exists(page) ? landingHref(page) : searchHref(sport, "programs", { where: country }), label: countryLabel(country), count, country };
    });
}

// A sport: a row per format, each leading to that format's page, then every country.
function SportHub({ page, listings, tiles, exists }: { page: Extract<Landing, { kind: "sport" }>; listings: Listing[]; tiles: Listing[]; exists: Exists }) {
  const { sport } = page;
  const name = SPORT_NAMES[sport];
  return (
    <>
      <Pills title={`${name} by country`} links={countryLinks(sport, listings, exists)} />
      {FORMATS.map(({ category }) => {
        const trips = groupTrips(tiles.filter((t) => t.category === category));
        if (trips.length === 0) return null;
        const format: Landing = { kind: "format", sport, format: category };
        const href = exists(format) ? landingHref(format) : searchHref(sport, "programs", { format: category });
        return (
          <Carousel
            key={category}
            title={`${name} ${FORMAT_LABELS[category].toLowerCase()}`}
            action={
              <Link href={href} className={`text-[0.9375rem] ${LINK}`}>
                Show all {trips.length}
              </Link>
            }
          >
            {trips.slice(0, ROW_MAX).map((trip) => (
              <li key={trip.programSlug} className={CAROUSEL_ITEM}>
                <TripCard trip={trip} sport={sport} />
              </li>
            ))}
          </Carousel>
        );
      })}
      <p className="mt-10">
        <Link href={searchHref(sport, "programs", {})} className={`text-[0.9375rem] ${LINK}`}>
          Search all {name.toLowerCase()} trips by month and level
        </Link>
      </p>
    </>
  );
}

// One format of a sport: all of its trips, with the other formats and the countries a step away.
function FormatPage({ page, listings, trips, exists }: { page: Extract<Landing, { kind: "format" }>; listings: Listing[]; trips: Trip[]; exists: Exists }) {
  const { sport } = page;
  const name = SPORT_NAMES[sport];
  const others = FORMATS.filter((f) => f.category !== page.format)
    .map((f): Landing => ({ kind: "format", sport, format: f.category }))
    .filter(exists)
    .map((p) => {
      const { format } = p as Extract<Landing, { kind: "format" }>;
      return { href: landingHref(p), label: `${name} ${FORMAT_LABELS[format].toLowerCase()}`, format };
    });
  return (
    <>
      <Pills title={`More ${name.toLowerCase()} trips`} links={[...others, { href: `/${sport}`, label: `All ${name.toLowerCase()}`, sport }]} />
      <SectionTitle
        action={
          <Link href={searchHref(sport, "programs", { format: page.format })} className={`text-[0.9375rem] ${LINK}`}>
            Filter by country, month and level
          </Link>
        }
      >
        {plural(trips.length, `${name.toLowerCase()} ${FORMAT_LABELS[page.format].toLowerCase().replace(/s$/, "")}`)}, soonest first
      </SectionTitle>
      <TripGrid trips={trips} sport={sport} />
      <Pills title={`${name} by country`} links={countryLinks(sport, listings, exists)} />
    </>
  );
}

// A sport in a country: all of its trips there, then the same sport elsewhere and other sports here.
function PlacePage({ page, listings, trips, pages }: { page: Extract<Landing, { kind: "place" }>; listings: Listing[]; trips: Trip[]; pages: Landing[] }) {
  const { sport, country } = page;
  const name = SPORT_NAMES[sport];
  const exists: Exists = (other) => pages.some((p) => landingHref(p) === landingHref(other));
  const here = pages
    .filter((p): p is Extract<Landing, { kind: "place" }> => p.kind === "place" && p.country === country && p.sport !== sport)
    .map((p) => ({ href: landingHref(p), label: `${SPORT_NAMES[p.sport]} ${inCountry(country)}`, sport: p.sport }));
  const hub: Landing = { kind: "destination", country };
  return (
    <>
      <SectionTitle
        action={
          <Link href={searchHref(sport, "programs", { where: country })} className={`text-[0.9375rem] ${LINK}`}>
            Filter by month, level and format
          </Link>
        }
      >
        {plural(trips.length, `${name.toLowerCase()} trip`)} {inCountry(country)}, soonest first
      </SectionTitle>
      <TripGrid trips={trips} sport={sport} />
      <Pills title={`${name} in other countries`} links={countryLinks(sport, listings, exists, country)} />
      <Pills
        title={`Also ${inCountry(country)}`}
        links={[...here, ...(exists(hub) ? [{ href: landingHref(hub), label: `Everything ${inCountry(country)}`, country }] : [])]}
      />
    </>
  );
}

// A country across sports: a section per sport, each leading to that sport's page for the country.
function DestinationPage({ page, tiles, pages, exists }: { page: Extract<Landing, { kind: "destination" }>; tiles: Listing[]; pages: Landing[]; exists: Exists }) {
  const { country } = page;
  const others = pages
    .filter((p): p is Extract<Landing, { kind: "destination" }> => p.kind === "destination" && p.country !== country)
    .map((p) => ({ href: landingHref(p), label: countryLabel(p.country), country: p.country }));
  return (
    <>
      {sportsIn(tiles).map((sport) => {
        const trips = groupTrips(tiles.filter((t) => t.sports.includes(sport)));
        const place: Landing = { kind: "place", sport, country };
        return (
          <section key={sport}>
            <SectionTitle
              action={
                <Link href={exists(place) ? landingHref(place) : searchHref(sport, "programs", { where: country })} className={`text-[0.9375rem] ${LINK}`}>
                  {exists(place) ? `More on ${SPORT_NAMES[sport].toLowerCase()} ${inCountry(country)}` : "Filter by month and level"}
                </Link>
              }
            >
              {plural(trips.length, `${SPORT_NAMES[sport].toLowerCase()} trip`)} {inCountry(country)}
            </SectionTitle>
            <TripGrid trips={trips} sport={sport} />
          </section>
        );
      })}
      <Pills title="More destinations" links={[...others, { href: "/destinations", label: "All destinations" }]} />
    </>
  );
}

// For pages that only need to know whether an address is a landing page (the routes).
export async function findLanding(path: string) {
  const { listings } = await getHomeData();
  return landingAt(path, listings);
}
