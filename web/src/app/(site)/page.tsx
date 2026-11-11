import Link from "next/link";
import { CONTAINER } from "@/components/Browse";
import { OperatorCard, TripCard, VenueCard } from "@/components/Cards";
import { CAROUSEL_ITEM, Carousel } from "@/components/Carousel";
import { HomeHero } from "@/components/HomeHero";
import { CalendarIcon, PinIcon, StoreIcon } from "@/components/icons";
import { getHomeData, getOperators } from "@/lib/db";
import { SPORTS, SPORT_NAMES, type Sport, type Trip } from "@/lib/sports";
import { groupTrips, programCount } from "@/lib/tiles";
import { LINK } from "@/lib/ui";

export const revalidate = 3600;

const FORMATS = [
  ["camp", "camps"],
  ["clinic", "clinics"],
  ["social_getaway", "getaways"],
] as const;
// a showcase row needs enough trips to be worth scrolling, and stops before it becomes a list
const ROW_MIN = 3;
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
      href: `/trips?sport=${sport}&format=${format}`,
      sport,
      trips: featuredFirst(mine.filter((t) => t.category === format)),
    })).filter((row) => row.trips.length >= ROW_MIN);
    if (rows.length > 0 || mine.length === 0) return rows;
    return [{ key: sport, title: `${SPORT_NAMES[sport]} trips`, href: `/trips?sport=${sport}`, sport, trips: featuredFirst(mine) }];
  });
}

const POINTS = [
  {
    icon: PinIcon,
    title: "Find a trip",
    text: "Coached tennis, pickleball and padel camps, clinics and getaways from independent operators, in one place.",
  },
  {
    icon: CalendarIcon,
    title: "Compare dates and prices",
    text: "Every upcoming departure with its price and availability, checked against the operator's own page.",
  },
  {
    icon: StoreIcon,
    title: "Book with the operator",
    text: "We send you straight to the people who run the trip. No booking fee, no commission, no middleman.",
  },
];

export default async function Home() {
  const [{ stats, listings, venues }, operators] = await Promise.all([getHomeData(), getOperators()]);
  const trips = groupTrips(listings);
  const rows = showcase(trips);
  const countries = new Set(listings.map((l) => l.country).filter(Boolean)).size;

  return (
    <main className={CONTAINER}>
      <HomeHero stats={stats} listings={listings} />

      <section aria-labelledby="about-heading" className="mt-16 grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
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
              [trips.length, "trips"],
              [countries, "countries"],
              [operators.length, "operators"],
            ].map(([value, label]) => (
              <div key={label} className="flex flex-col-reverse">
                <dt className="text-[0.9375rem] text-ink-soft">{label}</dt>
                <dd className="text-[2rem] leading-none font-black tracking-[-0.03em] tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <ol className="grid gap-6 sm:grid-cols-3 lg:gap-8">
          {POINTS.map(({ icon: Icon, title, text }, i) => (
            <li key={title} className="border-t-2 border-ink pt-4">
              <div className="flex items-center justify-between">
                <Icon className="size-6" />
                <span aria-hidden="true" className="text-[0.8125rem] font-extrabold text-ink-soft tabular-nums">
                  0{i + 1}
                </span>
              </div>
              <h3 className="mt-3 text-[1.125rem] font-extrabold tracking-[-0.01em]">{title}</h3>
              <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-soft">{text}</p>
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
