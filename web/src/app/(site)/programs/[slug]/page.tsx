import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CONTAINER, H1 } from "@/components/Browse";
import { BookingCard, MobileBookingBar } from "@/components/program/BookingCard";
import { CourtFacts } from "@/components/program/CourtFacts";
import { DateTable } from "@/components/program/DateTable";
import { Gallery } from "@/components/program/Gallery";
import { VenueBlock } from "@/components/program/VenueBlock";
import { CategoryIcon, InclusionIcon, LevelIcon, PinIcon } from "@/components/icons";
import { JsonLd } from "@/components/JsonLd";
import { Crumbs } from "@/components/Landing";
import { countryLabel } from "@/lib/country-info";
import { CATEGORY_NAMES, PRICE_UNIT_NAMES, levelLabel, placeLabel } from "@/lib/format";
import { getHomeData, getProgram, getVenue, programSlugs } from "@/lib/db";
import { breadcrumbs, tripEvents, type Crumb } from "@/lib/jsonld";
import { landingAt, landingHref } from "@/lib/landing";
import { RatingBadges } from "@/components/Ratings";
import { SPORT_NAMES, type ProgramDetail, type Sport } from "@/lib/sports";
import { LINK } from "@/lib/ui";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ date?: string }>;
};

// Prerendered at build, then refreshed hourly so edits show up and past dates drop off.
export const revalidate = 3600;

export async function generateStaticParams() {
  return (await programSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const program = await getProgram(slug);
  if (!program) return {};
  const title = `${program.title}, ${placeLabel(program)} | Court Trips`;
  return {
    title,
    description: program.description,
    // one address per trip, whichever date a tile linked to
    alternates: { canonical: `/programs/${slug}` },
    // A page's own openGraph replaces the site-wide one, image included, so programs without photos
    // name the site-wide court image themselves.
    openGraph: { title, description: program.description, images: [program.photos[0] ?? "/opengraph-image"] },
  };
}

// The session a tile opened with, else the next bookable one.
function pickSession(program: ProgramDetail, date?: string) {
  return (
    program.sessions.find((s) => s.start === date) ??
    program.sessions.find((s) => s.status !== "sold_out") ??
    program.sessions[0] ??
    null
  );
}

export default async function ProgramPage({ params, searchParams }: Props) {
  const program = await getProgram((await params).slug);
  if (!program) notFound();
  const session = pickSession(program, (await searchParams).date);
  const sport = program.sports[0] as Sport;
  const [venue, { listings }] = await Promise.all([program.venueSlug ? getVenue(program.venueSlug) : null, getHomeData()]);

  // the way back up: the sport, then the sport in this country when that has a page of its own
  const place = program.country ? landingAt(landingHref({ kind: "place", sport, country: program.country }), listings) : null;
  const trail: Crumb[] = [
    { name: "Home", href: "/" },
    { name: SPORT_NAMES[sport], href: `/${sport}` },
    ...(place && program.country ? [{ name: countryLabel(program.country), href: landingHref(place) }] : []),
  ];

  return (
    <>
      <main className={CONTAINER}>
        <JsonLd data={breadcrumbs([...trail, { name: program.title, href: `/programs/${program.slug}` }])} />
        {program.sessions.length > 0 && <JsonLd data={tripEvents(program)} />}
        <Crumbs crumbs={trail} trail />
        <h1 className={`mt-3 max-w-[22ch] ${H1}`}>
          {program.title}
        </h1>
        <ul className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[0.9375rem]">
          <li className="flex items-center gap-2 font-semibold">
            <CategoryIcon category={program.category} />
            {CATEGORY_NAMES[program.category]}
          </li>
          <li className="flex items-center gap-2">
            <LevelIcon level={program.level} />
            {levelLabel(program.level)}
          </li>
          <li className="flex items-center gap-2">
            <PinIcon className="size-5 text-ink-soft" />
            {placeLabel(program)}
          </li>
          <li className="text-ink-soft">
            Run by{" "}
            {program.operatorSlug ? (
              <Link href={`/operators/${program.operatorSlug}`} className={`text-ink ${LINK}`}>
                {program.organizer}
              </Link>
            ) : (
              <span className="font-semibold text-ink">{program.organizer}</span>
            )}
            {program.soldThrough && <>, sold through {program.soldThrough}</>}
          </li>
        </ul>

        <Gallery photos={program.photos} sport={sport} title={program.title} />

        <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="min-w-0">
            <CourtFacts program={program} session={session} sport={sport} />

            <Section title="About this trip">
              <p className="max-w-[65ch] text-[1.0625rem] leading-relaxed">{program.description}</p>
              {program.coaches.length > 0 && (
                <p className="mt-4 text-[1rem] text-ink-soft">
                  Coached by <span className="font-semibold text-ink">{program.coaches.join(" and ")}</span>.
                </p>
              )}
            </Section>

            {program.inclusions.length > 0 && (
              <Section title="What's included">
                <ul className="grid max-w-[640px] gap-x-8 gap-y-3 sm:grid-cols-2">
                  {program.inclusions.map((item) => (
                    <li key={item} className="flex items-center gap-3 text-[1rem]">
                      <InclusionIcon item={item} className="size-6" />
                      <span className="first-letter:uppercase">{item}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            <Section title="Dates and prices" id="dates">
              {/* the table lists bare amounts, so say what they cover: the operator's own notes if
                  there are any, else the price unit */}
              {program.sessions.length > 0 && (program.priceNotes || program.priceUnit) && (
                <p className="mb-3 max-w-[65ch] text-[0.9375rem] text-ink-soft">
                  {program.priceNotes ?? `Prices are ${PRICE_UNIT_NAMES[program.priceUnit!]}.`}
                </p>
              )}
              <DateTable program={program} selected={session?.start ?? null} />
            </Section>

            {program.operatorRatings.length > 0 && (
              <Section title={`Ratings for ${program.organizer}`}>
                <RatingBadges ratings={program.operatorRatings} />
              </Section>
            )}

            {(venue || program.venueName) && (
              <Section title="Where you'll play">
                <VenueBlock program={program} venue={venue} sport={sport} />
              </Section>
            )}
          </div>

          <aside className="hidden lg:block">
            <div className="sticky top-6">
              <BookingCard program={program} session={session} />
            </div>
          </aside>
        </div>
      </main>
      <MobileBookingBar program={program} session={session} />
    </>
  );
}

function Section({ title, id, children }: { title: string; id?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mt-10 scroll-mt-6">
      <h2 className="mb-4 text-[1.375rem] font-extrabold tracking-[-0.02em]">{title}</h2>
      {children}
    </section>
  );
}
