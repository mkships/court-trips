import Image from "next/image";
import { Court } from "@/components/Court";
import { SURFACES } from "@/lib/surfaces";
import { CATEGORY_NAMES, dateRange, levelLabel, placeLabel, priceFrom } from "@/lib/format";
import { SPORT_NAMES, type Listing, type Sport, type Venue } from "@/lib/sports";
import Link from "next/link";
import { programCount, tileHref } from "@/lib/tiles";

const STATUS_NAMES = { sold_out: "Sold out", waitlist: "Waitlist" } as const;
const SIZES = "(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw";

export function ListingRow({ sport, total, listings }: { sport: Sport; total: number; listings: Listing[] }) {
  return (
    <Row
      title={`Upcoming ${SPORT_NAMES[sport].toLowerCase()} trips`}
      action={
        <a href={`/search?sport=${sport}`} className="shrink-0 text-[0.9375rem] font-semibold underline underline-offset-4 hover:no-underline">
          Show all {total}
        </a>
      }
    >
      {listings.map((listing) => (
        <li key={listing.key}>
          <ListingCard listing={listing} sport={sport} />
        </li>
      ))}
    </Row>
  );
}

export function VenueRow({ sport, venues, programs }: { sport: Sport; venues: Venue[]; programs: Listing[] }) {
  const name = SPORT_NAMES[sport].toLowerCase();
  return (
    <Row title={`Places to stay with ${name} courts`}>
      {venues.length === 0 && (
        <li className="text-ink-soft sm:col-span-2">No {name} venues listed yet. Try another sport.</li>
      )}
      {venues.map((venue) => (
        <li key={venue.slug}>
          <VenueCard venue={venue} sport={sport} programs={programCount(programs.filter((p) => p.venueSlug === venue.slug))} />
        </li>
      ))}
    </Row>
  );
}

function Row({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section aria-labelledby="row-heading" className="mt-10">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="row-heading" className="text-[1.625rem] font-extrabold tracking-[-0.02em]">
          {title}
        </h2>
        {action}
      </div>
      <ul className="mt-6 grid grid-cols-1 gap-x-6 gap-y-9 sm:grid-cols-2 lg:grid-cols-4">{children}</ul>
    </section>
  );
}

export function ListingCard({ listing, sport }: { listing: Listing; sport: Sport }) {
  const status = listing.status === "sold_out" || listing.status === "waitlist" ? STATUS_NAMES[listing.status] : null;
  const price = priceFrom(listing);

  return (
    <Link href={tileHref(listing)} className="group block">
      <Photo src={listing.photos[0]} sport={sport}>
        <span className="rounded-full bg-white px-3 py-1 text-[0.8125rem] font-semibold">
          {CATEGORY_NAMES[listing.category]}
        </span>
        <span className="rounded-full bg-white/85 px-3 py-1 text-[0.8125rem] backdrop-blur-sm">{levelLabel(listing.level)}</span>
        {status && <span className="rounded-full bg-ink px-3 py-1 text-[0.8125rem] font-semibold text-white">{status}</span>}
      </Photo>
      <p className="mt-3 text-[0.9375rem] font-bold">{placeLabel(listing)}</p>
      <p className="text-[0.9375rem] text-ink-soft group-hover:underline">{listing.title}</p>
      <p className="text-[0.9375rem] text-ink-soft">
        {dateRange(listing)}
      </p>
      {price && <p className="mt-1 text-[0.9375rem] font-semibold">{price}</p>}
    </Link>
  );
}

export function VenueCard({ venue, sport, programs }: { venue: Venue; sport: Sport; programs: number }) {
  const courts = venue.courts
    .filter((c) => c.sport === sport)
    .map((c) => [c.count, c.surface?.toLowerCase(), `${c.sport} ${c.count === 1 ? "court" : "courts"}`].filter(Boolean).join(" "));

  return (
    <a href={venue.website} target="_blank" rel="noopener noreferrer" className="group block">
      <Photo src={venue.photos[0]} sport={sport}>
        <span className="rounded-full bg-white px-3 py-1 text-[0.8125rem] font-semibold capitalize">{venue.kind}</span>
      </Photo>
      <p className="mt-3 text-[0.9375rem] font-bold">{placeLabel(venue)}</p>
      <p className="text-[0.9375rem] text-ink-soft group-hover:underline">{venue.name}</p>
      <p className="text-[0.9375rem] text-ink-soft first-letter:uppercase">{courts.join(", ")}</p>
      {programs > 0 && (
        <p className="mt-1 text-[0.9375rem] font-semibold">
          {programs} {SPORT_NAMES[sport].toLowerCase()} {programs === 1 ? "program" : "programs"} here
        </p>
      )}
    </a>
  );
}

// Card image; operators without usable photos get their sport's court instead.
function Photo({ src, sport, children }: { src?: string; sport: Sport; children: React.ReactNode }) {
  return (
    <div
      className="relative aspect-[20/19] overflow-hidden rounded-2xl"
      style={{ backgroundColor: src ? "var(--color-rule)" : SURFACES[sport].surround }}
    >
      {src ? (
        <Image src={src} alt="" fill sizes={SIZES} className="object-cover" />
      ) : (
        <Court sport={sport} className="absolute inset-0 m-auto h-full w-[78%]" />
      )}
      <div className="absolute top-3 right-3 left-3 flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}
