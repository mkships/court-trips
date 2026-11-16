import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CONTAINER, H1 } from "@/components/Browse";
import { TILE_GRID, TripCard } from "@/components/Cards";
import { CheckIcon, ExternalIcon, PinIcon } from "@/components/icons";
import { Gallery } from "@/components/program/Gallery";
import { RatingBadges } from "@/components/Ratings";
import { getHomeData, getVenue } from "@/lib/db";
import { hostOf, placeLabel } from "@/lib/format";
import { SPORT_NAMES, type Sport, type Venue } from "@/lib/sports";
import { SURFACES } from "@/lib/surfaces";
import { groupTrips } from "@/lib/tiles";
import { BTN_PRIMARY, LINK, LINK_QUIET } from "@/lib/ui";

type Props = { params: Promise<{ slug: string }> };

export const revalidate = 3600;

export async function generateStaticParams() {
  return (await getHomeData()).venues.map((v) => ({ slug: v.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const venue = await getVenue((await params).slug);
  if (!venue) return {};
  const title = `${venue.name}, ${placeLabel(venue)} | Court Trips`;
  const description = venue.description ?? `${venue.name}: courts, facilities and the coached trips that run there.`;
  return { title, description, openGraph: { title, description, ...(venue.photos[0] && { images: [venue.photos[0]] }) } };
}

// "6 clay courts", "2 indoor hard courts", "Courts"
function courtLabel(c: Venue["courts"][number]) {
  const words = [c.count, c.indoor ? "indoor" : null, c.surface?.toLowerCase(), c.count === 1 ? "court" : "courts"].filter(Boolean).join(" ");
  return words.replace(/^./, (ch) => ch.toUpperCase());
}

export default async function VenuePage({ params }: Props) {
  const venue = await getVenue((await params).slug);
  if (!venue) notFound();
  const { listings } = await getHomeData();
  const trips = groupTrips(listings.filter((t) => t.venueSlug === venue.slug));
  const sport = (venue.sports[0] ?? "tennis") as Sport;
  const facts = [venue.kind, venue.stars ? `${venue.stars}-star` : null, venue.adultsOnly ? "adults only" : null].filter(Boolean).join(" · ");

  return (
    <main className={CONTAINER}>
      <Link href="/resorts" className={`inline-flex items-center gap-1.5 text-[0.9375rem] ${LINK_QUIET}`}>
        <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden="true">
          <path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        All resorts & clubs
      </Link>
      <h1 className={`mt-3 max-w-[22ch] ${H1}`}>{venue.name}</h1>
      <ul className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[0.9375rem]">
        <li className="font-semibold first-letter:uppercase">{facts}</li>
        <li className="flex items-center gap-2">
          <PinIcon className="size-5 text-ink-soft" />
          {placeLabel(venue)}
        </li>
      </ul>

      <Gallery photos={venue.photos} sport={sport} title={venue.name} />

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0">
          {venue.courts.length > 0 && (
            <dl aria-label="Courts" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {venue.courts.map((c, i) => (
                <div key={i} className="flex flex-col-reverse rounded-2xl px-5 py-4 text-white" style={{ backgroundColor: SURFACES[c.sport as Sport]?.court ?? SURFACES.tennis.court }}>
                  <dt className="mt-0.5 text-[0.875rem]">{SPORT_NAMES[c.sport as Sport] ?? c.sport}</dt>
                  <dd className="text-[1.25rem] leading-tight font-extrabold tracking-[-0.02em]">{courtLabel(c)}</dd>
                </div>
              ))}
            </dl>
          )}

          {venue.description && (
            <Section title={`About ${venue.name}`}>
              <p className="max-w-[65ch] text-[1.0625rem] leading-relaxed">{venue.description}</p>
            </Section>
          )}

          {venue.amenities.length > 0 && (
            <Section title="On site">
              <ul className="grid max-w-[640px] gap-x-8 gap-y-3 sm:grid-cols-2">
                {venue.amenities.map((item) => (
                  <li key={item} className="flex items-center gap-3 text-[1rem]">
                    <CheckIcon className="size-6" />
                    <span className="first-letter:uppercase">{item}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {venue.ratings.length > 0 && (
            <Section title="Ratings">
              <RatingBadges ratings={venue.ratings} />
            </Section>
          )}
        </div>

        <aside>
          <div className="rounded-3xl p-6 shadow-card ring-1 ring-ink/5 lg:sticky lg:top-6">
            <p className="text-[1.25rem] font-extrabold tracking-[-0.02em]">Staying here</p>
            <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-soft">
              {venue.priceNotes ?? "Rooms and court time are booked with the venue. Court Trips lists the coached trips that run here."}
            </p>
            {venue.website && (
              <>
                <a href={`/go/venue/${venue.slug}`} rel="nofollow" className={`mt-5 flex min-h-14 w-full px-6 py-3 text-[1.0625rem] ${BTN_PRIMARY}`}>
                  Visit the venue
                  <ExternalIcon className="size-[18px]" />
                </a>
                <p className="mt-3 text-center text-[0.8125rem] text-ink-soft">Opens {hostOf(venue.website)}.</p>
              </>
            )}
          </div>
        </aside>
      </div>

      <section className="mt-14">
        <h2 className="text-[1.625rem] font-extrabold tracking-[-0.02em]">
          {trips.length > 0 ? `${trips.length} ${trips.length === 1 ? "trip" : "trips"} at ${venue.name}` : `Trips at ${venue.name}`}
        </h2>
        {trips.length > 0 ? (
          <ul className={`mt-6 ${TILE_GRID}`}>
            {trips.map((trip) => (
              <li key={trip.programSlug}>
                <TripCard trip={trip} sport={trip.sports[0] as Sport} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 max-w-[60ch] text-ink-soft">
            No coached trips are listed here yet.{" "}
            {venue.country && (
              <Link href={`/trips?sport=${sport}&where=${encodeURIComponent(venue.country)}`} className={`text-ink ${LINK}`}>
                See {SPORT_NAMES[sport].toLowerCase()} trips in {venue.country}
              </Link>
            )}
          </p>
        )}
      </section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="mb-4 text-[1.375rem] font-extrabold tracking-[-0.02em]">{title}</h2>
      {children}
    </section>
  );
}
