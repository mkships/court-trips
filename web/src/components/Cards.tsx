import Link from "next/link";
import { Court } from "@/components/Court";
import { Money } from "@/components/Currency";
import { CategoryIcon } from "@/components/icons";
import { Star, topRating } from "@/components/Ratings";
import { SafeImage } from "@/components/SafeImage";
import { CATEGORY_NAMES, dateRange, levelLabel, placeLabel, shortDay, shortPlaceLabel } from "@/lib/format";
import { SPORTS, SPORT_NAMES, type Listing, type Operator, type Sport, type Trip, type TripDate, type Venue } from "@/lib/sports";
import { SURFACES } from "@/lib/surfaces";
import { tileHref } from "@/lib/tiles";
import { CHIP, LINK_QUIET, PILL } from "@/lib/ui";

// The three cards of the directory: a trip, a resort or club, an operator. They share one shape
// (photo, then one line each for where, what and detail) so any mix of them lines up in a row.

// ~230px tiles from tablet up: 3, 4 then 5 columns
export const TILE_GRID = "grid grid-cols-1 gap-x-5 gap-y-9 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5";
const SIZES = "(min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 768px) 33vw, (min-width: 640px) 50vw, 100vw";
// the card's name: its underline fades in when the card is pointed at
const NAME = "underline decoration-transparent decoration-[1.5px] underline-offset-4 transition-colors group-hover:decoration-current";
// how many dates fit on a card's rail before "+N"
const RAIL = 3;

// One card per trip, however many dates it runs on. The dates sit on a rail under it: each opens
// the trip with that date chosen.
export function TripCard({ trip, sport }: { trip: Trip; sport: Sport }) {
  const soldOut = trip.dates.length > 0 && trip.dates.every((d) => d.status === "sold_out");
  const waitlist = !soldOut && trip.dates.length > 0 && trip.dates.every((d) => d.status !== "available");

  return (
    <article>
      <Link href={tileHref(trip)} className="group block">
        <Photo
          src={trip.photos[0]}
          sport={sport}
          badge={
            (soldOut || waitlist) && (
              <span className="rounded-full bg-ink px-3 py-1 text-[0.8125rem] font-semibold text-white">{soldOut ? "Sold out" : "Waitlist"}</span>
            )
          }
        >
          <span className={`inline-flex items-center gap-1.5 pl-2 ${CHIP}`}>
            <CategoryIcon category={trip.category} className="size-4" />
            {CATEGORY_NAMES[trip.category]}
          </span>
          <span className="rounded-full bg-white/85 px-3 py-1 text-[0.8125rem] backdrop-blur-sm">{levelLabel(trip.level)}</span>
        </Photo>
        {/* one line each, so cards in a row line up */}
        <p className="mt-3 truncate text-[0.9375rem] font-bold" title={placeLabel(trip)}>
          {shortPlaceLabel(trip)}
        </p>
        <p className={`truncate text-[0.9375rem] text-ink-soft ${NAME}`} title={trip.title}>
          {trip.title}
        </p>
        <p className="mt-1 text-[0.9375rem] font-semibold">
          {trip.priceFrom != null && trip.currency ? <Money amount={trip.priceFrom} currency={trip.currency} prefix="From" /> : "Price on request"}
        </p>
      </Link>
      <DateRail trip={trip} />
    </article>
  );
}

function DateRail({ trip }: { trip: Trip }) {
  if (trip.dates.length === 0) {
    return <p className="mt-2 truncate text-[0.875rem] text-ink-soft">{dateRange(trip)}</p>;
  }
  const more = trip.dates.length - RAIL;
  // a single date has room for its full range; several show the day each starts
  const label = (d: TripDate) => (trip.dates.length === 1 ? dateRange({ ...d, scheduleNotes: null }) : shortDay(d.start));
  return (
    <ul aria-label={`Dates for ${trip.title}`} className="mt-2 flex items-center gap-1 overflow-hidden">
      {trip.dates.slice(0, RAIL).map((d) => (
        <li key={d.start} className="shrink-0">
          <Link
            href={tileHref({ programSlug: trip.programSlug, start: d.start })}
            title={`${dateRange({ ...d, scheduleNotes: null })}${d.status === "sold_out" ? ", sold out" : d.status === "waitlist" ? ", waitlist only" : ""}`}
            className={`px-2 py-1 text-[0.8125rem] font-medium whitespace-nowrap ${PILL} ${d.status === "sold_out" ? "text-ink-soft line-through decoration-1" : ""}`}
          >
            {d.status === "waitlist" && <span aria-hidden="true" className="size-1.5 rounded-full bg-warn" />}
            {label(d)}
          </Link>
        </li>
      ))}
      {more > 0 && (
        <li className="shrink-0">
          <Link href={`/programs/${trip.programSlug}#dates`} aria-label={`${more} more dates`} className={`px-1 py-1 text-[0.8125rem] ${LINK_QUIET}`}>
            +{more}
          </Link>
        </li>
      )}
    </ul>
  );
}

const courtLine = (venue: Venue, sport?: Sport) =>
  venue.courts
    .filter((c) => !sport || c.sport === sport)
    .map((c) => [c.count, c.surface?.toLowerCase(), `${c.sport} ${c.count === 1 ? "court" : "courts"}`].filter(Boolean).join(" "))
    .join(", ");

// A resort, hotel, club or academy with courts. `sport` narrows the courts line to one sport;
// `trips` is how many listed trips run there.
export function VenueCard({ venue, sport, trips }: { venue: Venue; sport?: Sport; trips: number }) {
  const shown = sport ?? ((venue.sports[0] ?? "tennis") as Sport);
  return (
    <Link href={`/resorts/${venue.slug}`} className="group block">
      <Photo src={venue.photos[0]} sport={shown}>
        <span className={`capitalize ${CHIP}`}>{venue.kind}</span>
        {venue.stars && <span className="rounded-full bg-white/85 px-3 py-1 text-[0.8125rem] backdrop-blur-sm">{venue.stars}-star</span>}
      </Photo>
      <p className="mt-3 truncate text-[0.9375rem] font-bold" title={placeLabel(venue)}>
        {shortPlaceLabel(venue)}
      </p>
      <p className={`truncate text-[0.9375rem] text-ink-soft ${NAME}`}>{venue.name}</p>
      <p className="truncate text-[0.9375rem] text-ink-soft first-letter:uppercase">{courtLine(venue, sport)}</p>
      <p className="mt-1 text-[0.9375rem] font-semibold">
        {trips > 0 ? `${trips} ${trips === 1 ? "trip" : "trips"} here` : <span className="font-normal text-ink-soft">No trips listed yet</span>}
      </p>
    </Link>
  );
}

// An operator: a photo from their soonest trip, how many trips they run, and where.
export function OperatorCard({ operator, tiles }: { operator: Operator; tiles: Listing[] }) {
  const sport = (tiles[0]?.sports[0] ?? "tennis") as Sport;
  const countries = [...new Set(tiles.map((t) => t.country).filter(Boolean))];
  const sports = SPORTS.filter((s) => tiles.some((t) => t.sports.includes(s)));
  const n = operator.programSlugs.length;
  const rating = topRating(operator.ratings);
  return (
    <Link href={`/operators/${operator.slug}`} className="group block">
      <Photo src={tiles.find((t) => t.photos[0])?.photos[0]} sport={sport}>
        <span className={CHIP}>
          {n} {n === 1 ? "trip" : "trips"}
        </span>
        {rating && (
          <span className={`inline-flex items-center gap-1 ${CHIP}`}>
            <Star className="size-3.5 text-warn" />
            {rating.rating.toFixed(1)}
            <span className="sr-only">out of 5 on {rating.source}</span>
          </span>
        )}
      </Photo>
      <p className="mt-3 truncate text-[0.9375rem] font-bold" title={countries.join(", ")}>
        {countries.length > 3 ? `${countries.slice(0, 2).join(", ")} and ${countries.length - 2} more` : countries.join(", ")}
      </p>
      <p className={`truncate text-[0.9375rem] text-ink-soft ${NAME}`}>{operator.name}</p>
      <p className="truncate text-[0.9375rem] text-ink-soft">{sports.map((s) => SPORT_NAMES[s]).join(", ")}</p>
    </Link>
  );
}

// Card image; listings without usable photos get their sport's court instead.
// `badge` (sold out, waitlist) sits bottom-left so the top chips stay on one line.
function Photo({ src, sport, badge, children }: { src?: string; sport: Sport; badge?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div
      className="relative aspect-[20/19] overflow-hidden rounded-2xl"
      style={{ backgroundColor: src ? "var(--color-rule)" : SURFACES[sport].surround }}
    >
      {src ? (
        <SafeImage
          sport={sport}
          src={src}
          alt=""
          fill
          sizes={SIZES}
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04] motion-reduce:transition-none"
        />
      ) : (
        <Court sport={sport} className="absolute inset-0 m-auto h-full w-[78%] transition-transform duration-500 ease-out group-hover:scale-[1.04] motion-reduce:transition-none" />
      )}
      <div className="absolute top-3 right-3 left-3 flex flex-wrap gap-1.5">{children}</div>
      {badge && <div className="absolute bottom-3 left-3">{badge}</div>}
    </div>
  );
}
