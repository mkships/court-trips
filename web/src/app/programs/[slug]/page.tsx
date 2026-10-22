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
import { CATEGORY_NAMES, hostOf, placeLabel } from "@/lib/format";
import { getProgram, getVenue, programSlugs } from "@/lib/seed";
import { SPORT_NAMES, type ProgramDetail, type Sport } from "@/lib/sports";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ date?: string }>;
};

export function generateStaticParams() {
  return programSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const program = getProgram((await params).slug);
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
  const program = getProgram((await params).slug);
  if (!program) notFound();
  const session = pickSession(program, (await searchParams).date);
  const sport = program.sports[0] as Sport;
  const venue = program.venueSlug ? getVenue(program.venueSlug) : null;

  return (
    <div className="on-paper pb-28 lg:pb-20">
      <Header />
      <main className="mx-auto max-w-[1280px] px-4 sm:px-8">
        <Link href={`/?sport=${sport}`} className="text-[0.9375rem] font-semibold text-ink-soft hover:text-ink hover:underline">
          All {SPORT_NAMES[sport].toLowerCase()} trips
        </Link>
        <h1 className="mt-3 max-w-[22ch] text-[2.25rem] leading-[1] font-black tracking-[-0.035em] text-balance sm:text-[3rem]">
          {program.title}
        </h1>
        <p className="mt-3 text-[1rem] text-ink-soft">
          {CATEGORY_NAMES[program.category]} in {placeLabel(program)}. Run by{" "}
          <span className="font-semibold text-ink">{program.organizer}</span>.
        </p>

        <Gallery photos={program.photos} sport={sport} title={program.title} />

        <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_380px]">
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
                <ul className="grid max-w-[640px] gap-x-8 gap-y-2.5 sm:grid-cols-2">
                  {program.inclusions.map((item) => (
                    <li key={item} className="flex items-baseline gap-3 text-[1rem]">
                      <span aria-hidden="true" className="h-[2px] w-3 shrink-0 translate-y-[-3px] bg-ink" />
                      <span className="first-letter:uppercase">{item}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            <Section title="Dates and prices" id="dates">
              <DateTable program={program} selected={session?.start ?? null} />
            </Section>

            {(venue || program.venueName) && (
              <Section title="Where it happens">
                <VenueBlock program={program} venue={venue} sport={sport} />
              </Section>
            )}

            <p className="mt-12 max-w-[65ch] border-t border-rule pt-6 text-[0.875rem] leading-relaxed text-ink-soft">
              {program.priceNotes && <>{program.priceNotes} </>}
              Details checked on {new Date(program.checkedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}{" "}
              from <a href={program.sourceUrl} className="underline hover:text-ink">{hostOf(program.sourceUrl)}</a>.
              You book and pay with {program.organizer} directly; Court Trips doesn&apos;t take payment.
            </p>
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
    <section id={id} className="mt-12 scroll-mt-6">
      <h2 className="mb-5 text-[1.375rem] font-extrabold tracking-[-0.02em]">{title}</h2>
      {children}
    </section>
  );
}
