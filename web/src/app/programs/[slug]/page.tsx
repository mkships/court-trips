import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { BookingCard, MobileBookingBar } from "@/components/program/BookingCard";
import { CourtFacts } from "@/components/program/CourtFacts";
import { DateTable } from "@/components/program/DateTable";
import { Gallery } from "@/components/program/Gallery";
import { VenueBlock } from "@/components/program/VenueBlock";
import { CategoryIcon, InclusionIcon, LevelIcon, PinIcon } from "@/components/icons";
import { CATEGORY_NAMES, PRICE_UNIT_NAMES, levelLabel, placeLabel } from "@/lib/format";
import { getProgram, getVenue, programSlugs } from "@/lib/db";
import { SPORT_NAMES, type ProgramDetail, type Sport } from "@/lib/sports";

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
  const program = await getProgram((await params).slug);
  if (!program) return {};
  const title = `${program.title}, ${placeLabel(program)} | Court Trips`;
  return {
    title,
    description: program.description,
    // programs without photos fall back to the site-wide court image
    openGraph: { title, description: program.description, ...(program.photos[0] && { images: [program.photos[0]] }) },
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
  const venue = program.venueSlug ? await getVenue(program.venueSlug) : null;

  return (
    <div className="on-paper pb-24 lg:pb-0">
      <Header />
      <main className="mx-auto max-w-[1280px] px-4 sm:px-8">
        <Link href={`/?sport=${sport}`} className="inline-flex items-center gap-1.5 text-[0.9375rem] font-semibold text-ink-soft transition-colors hover:text-ink">
          <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden="true">
            <path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          All {SPORT_NAMES[sport].toLowerCase()} trips
        </Link>
        <h1 className="mt-3 max-w-[22ch] text-[2.25rem] leading-[1] font-black tracking-[-0.035em] text-balance sm:text-[3rem]">
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
            Run by <span className="font-semibold text-ink">{program.organizer}</span>
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
              <Section title="What the price includes">
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

            {(venue || program.venueName) && (
              <Section title="Where it happens">
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
      <Footer />
      <MobileBookingBar program={program} session={session} />
    </div>
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
