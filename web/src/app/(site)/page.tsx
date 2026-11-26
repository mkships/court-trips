import type { Metadata } from "next";
import Link from "next/link";
import { CONTAINER } from "@/components/Browse";
import { OperatorCard, TripCard, VenueCard } from "@/components/Cards";
import { CAROUSEL_ITEM, Carousel } from "@/components/Carousel";
import { HomeHero } from "@/components/HomeHero";
import { Illustration } from "@/components/Illustration";
import { JsonLd } from "@/components/JsonLd";
import { NewsletterForm } from "@/components/NewsletterForm";
import { BookDirectIcon, CompareIcon, FindIcon } from "@/components/icons";
import { continentOf } from "@/lib/country-info";
import { getHomeData, getOperators } from "@/lib/db";
import { organization, website } from "@/lib/jsonld";
import { MIN_TRIPS, formatSlug } from "@/lib/landing";
import { SPORTS, SPORT_NAMES, type Sport, type Trip } from "@/lib/sports";
import { groupTrips, programCount } from "@/lib/tiles";
import { NEWSLETTER_TURNSTILE_ACTION, turnstileSiteKey } from "@/lib/turnstile";
import { LINK } from "@/lib/ui";

export const metadata: Metadata = { alternates: { canonical: "/" } };

export const revalidate = 3600;

const FORMATS = [
  ["camp", "camps"],
  ["clinic", "clinics"],
  ["social_getaway", "getaways"],
] as const;
// a showcase row needs enough trips to be worth scrolling (the same number that earns a format its
// own page, which the row links to), and stops before it becomes a list
const ROW_MIN = MIN_TRIPS;
const ROW_MAX = 12;

// Featured trips lead their row (in the order set in admin), then soonest first.
const featuredFirst = (trips: Trip[]) =>
  [...trips].sort((a, b) => (a.featuredRank ?? Infinity) - (b.featuredRank ?? Infinity));

type Row = { key: string; title: string; href: string; sport: Sport; trips: Trip[] };

// One row per sport and format with enough trips ("Tennis camps", "Padel getaways"); a sport
// without any such row still gets one row of everything it has.
function showcase(trips: Trip[]): Row[] {
  return SPORTS.flatMap((sport) => {
    const mine = trips.filter((t) => t.sports.includes(sport));
    const rows = FORMATS.map(([format, noun]) => ({
      key: `${sport}-${format}`,
      title: `${SPORT_NAMES[sport]} ${noun}`,
      href: `/${sport}/${formatSlug(format)}`,
      sport,
      trips: featuredFirst(mine.filter((t) => t.category === format)),
    })).filter((row) => row.trips.length >= ROW_MIN);
    if (rows.length > 0 || mine.length === 0) return rows;
    return [{ key: sport, title: `${SPORT_NAMES[sport]} trips`, href: `/${sport}`, sport, trips: featuredFirst(mine) }];
  });
}

// The headline numbers are rounded down to a figure that stays true as listings come and go:
// 105 reads "100+", 28 reads "25+". Under ten is shown as it is.
function atLeast(n: number) {
  if (n < 10) return String(n);
  const step = n < 50 ? 5 : n < 100 ? 10 : n < 250 ? 25 : n < 1000 ? 50 : 100;
  return `${(n - (n % step)).toLocaleString("en")}+`;
}

const POINTS = [
  {
    icon: FindIcon,
    title: "Find a trip",
    text: "Coached tennis, pickleball and padel camps, clinics and getaways from independent operators, in one place.",
  },
  {
    icon: CompareIcon,
    title: "Compare dates and prices",
    text: "Every upcoming date with its price and availability, checked against the operator's own page.",
  },
  {
    icon: BookDirectIcon,
    title: "Book with the operator",
    text: "We send you straight to the people who run the trip. No booking fee, no commission, no middleman.",
  },
];

export default async function Home() {
  const [{ stats, listings, venues }, operators] = await Promise.all([getHomeData(), getOperators()]);
  const trips = groupTrips(listings);
  const rows = showcase(trips);
  const countries = new Set(listings.map((l) => l.country).filter(Boolean));
  const continents = new Set([...countries].map(continentOf).filter(Boolean)).size;

  return (
    <main className={CONTAINER}>
      <JsonLd data={[organization(), website()]} />
      <HomeHero stats={stats} listings={listings} />

      {/* what Court Trips is, on the brand's warm paper with its illustration */}
      <section aria-labelledby="about-heading" className="mt-16 rounded-3xl bg-warm px-6 py-8 sm:px-10 sm:py-10">
        <div className="grid items-center gap-8 md:grid-cols-[minmax(0,1fr)_auto] md:gap-12">
          <div>
            <h2 id="about-heading" className="max-w-[16ch] text-[2rem] leading-[1.05] font-black tracking-[-0.03em] text-balance sm:text-[2.5rem]">
              Every coached racket trip, in one place
            </h2>
            <p className="mt-4 max-w-[48ch] text-[1.0625rem] leading-relaxed text-ink-soft">
              Court Trips is an independent directory of tennis, pickleball and padel holidays. We list them, you book
              them with the operator.
            </p>
            <dl className="mt-6 flex flex-wrap gap-x-10 gap-y-4">
              {[
                [atLeast(trips.length), "trips"],
                [atLeast(countries.size), "countries"],
                [continents, continents === 1 ? "continent" : "continents"],
              ].map(([value, label]) => (
                <div key={label} className="flex flex-col-reverse">
                  <dt className="text-[0.9375rem] text-ink-soft">{label}</dt>
                  <dd className="text-[2rem] leading-none font-black tracking-[-0.03em] tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <Illustration className="mx-auto h-auto w-[220px] md:w-[320px]" />
        </div>
        <ol className="mt-8 grid gap-x-10 gap-y-5 border-t border-ink/10 pt-7 md:grid-cols-3">
          {POINTS.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex gap-3.5">
              <Icon className="mt-0.5 size-7 shrink-0" />
              <div>
                <h3 className="text-[1.0625rem] font-extrabold tracking-[-0.01em]">{title}</h3>
                <p className="mt-1 text-[0.9375rem] leading-relaxed text-ink-soft">{text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {rows.map((row) => (
        <Carousel
          key={row.key}
          title={row.title}
          action={
            <Link href={row.href} className={`text-[0.9375rem] ${LINK}`}>
              Show all {row.trips.length}
            </Link>
          }
        >
          {row.trips.slice(0, ROW_MAX).map((trip) => (
            <li key={trip.programSlug} className={CAROUSEL_ITEM}>
              <TripCard trip={trip} sport={row.sport} />
            </li>
          ))}
        </Carousel>
      ))}

      <section
        aria-labelledby="newsletter-heading"
        className="mt-16 grid gap-6 rounded-3xl bg-mist px-6 py-8 sm:px-9 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center lg:gap-12"
      >
        <div>
          <h2 id="newsletter-heading" className="text-[1.625rem] leading-tight font-black tracking-[-0.03em] text-balance sm:text-[2rem]">
            New trips and dates, once a month
          </h2>
          <p className="mt-2 max-w-[48ch] text-[1rem] leading-relaxed text-ink-soft">
            The camps, clinics and getaways we&apos;ve just added, and next season&apos;s weeks as soon as operators open
            them. Only for the sports you play.
          </p>
        </div>
        <NewsletterForm siteKey={turnstileSiteKey()} action={NEWSLETTER_TURNSTILE_ACTION} />
      </section>

      {venues.length > 0 && (
        <Carousel
          title="Resorts & clubs"
          intro="Places with courts on site, and the trips that run there."
          action={
            <Link href="/resorts" className={`text-[0.9375rem] ${LINK}`}>
              Show all
            </Link>
          }
        >
          {venues.slice(0, ROW_MAX).map((venue) => (
            <li key={venue.slug} className={CAROUSEL_ITEM}>
              <VenueCard venue={venue} trips={programCount(listings.filter((t) => t.venueSlug === venue.slug))} />
            </li>
          ))}
        </Carousel>
      )}

      {operators.length > 0 && (
        <Carousel
          title="Operators"
          intro="The academies, coaches and tour operators who run the trips."
          action={
            <Link href="/operators" className={`text-[0.9375rem] ${LINK}`}>
              Show all {operators.length}
            </Link>
          }
        >
          {operators.slice(0, ROW_MAX).map((operator) => {
            const mine = new Set(operator.programSlugs);
            return (
              <li key={operator.slug} className={CAROUSEL_ITEM}>
                <OperatorCard operator={operator} tiles={listings.filter((t) => mine.has(t.programSlug))} />
              </li>
            );
          })}
        </Carousel>
      )}
    </main>
  );
}
