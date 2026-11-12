import type { Metadata } from "next";
import Link from "next/link";
import { CONTAINER, H1 } from "@/components/Browse";
import { Court } from "@/components/Court";
import { getHomeData } from "@/lib/db";
import { SURFACES } from "@/lib/surfaces";
import { groupTrips } from "@/lib/tiles";
import { BTN_PRIMARY, LINK } from "@/lib/ui";

export const metadata: Metadata = {
  title: "For operators | Court Trips",
  description: "Run a tennis, pickleball or padel camp, clinic or getaway? List it on Court Trips for free. Players book with you directly.",
};

export const revalidate = 3600;

const BENEFITS = [
  ["Free, with no commission", "Listing costs nothing and we never take a cut of a booking. There is nothing to sign."],
  ["Bookings stay yours", "Every Book button goes to your own booking page. You keep the customer, the payment and the relationship."],
  ["Players who are ready to travel", "People come here to choose a racket trip, by sport, country, month, level and format."],
  ["Your own operator page", "All your trips in one place, with your description, your website and your public ratings."],
];

const STEPS = [
  ["Tell us about the trip", "Dates, prices, level, what's included and a few photos, in one form."],
  ["We check it", "A person reads every listing against your website before it goes live."],
  ["Players find you", "Your trip appears in search, on your operator page and at the venue it runs at. We keep dates and prices in step with your site."],
];

const NEEDS = [
  "A coached camp, clinic or getaway for tennis, pickleball or padel",
  "Upcoming dates and a price players can see",
  "A page on your own site where players can book or enquire",
  "Photos you have the right to use",
];

export default async function ForOperatorsPage() {
  const { listings } = await getHomeData();
  const trips = groupTrips(listings).length;
  const countries = new Set(listings.map((l) => l.country).filter(Boolean)).size;

  return (
    <main className={CONTAINER}>
      <div className="on-surface grid overflow-hidden rounded-3xl text-white md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]" style={{ backgroundColor: SURFACES.tennis.surround }}>
        <div className="px-6 py-9 sm:px-10 sm:py-12">
          <p className="text-[0.9375rem] font-semibold text-ball">For operators</p>
          <h1 className={`mt-3 max-w-[16ch] ${H1}`}>Put your trip in front of players who travel to play</h1>
          <p className="mt-4 max-w-[52ch] text-[1.0625rem] leading-relaxed text-white/85">
            Court Trips lists {trips} coached trips in {countries} countries. Add yours for free: players book with you
            directly and we never take a cut.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link href="/list-your-program" className={`h-14 px-7 text-[1.0625rem] ${BTN_PRIMARY}`}>
              List your program
            </Link>
            <a href="#how" className="font-semibold underline decoration-white/40 decoration-[1.5px] underline-offset-4 transition-colors hover:decoration-white">
              How it works
            </a>
          </div>
        </div>
        <div className="hidden items-center p-10 md:flex">
          <Court sport="tennis" drawIn className="block aspect-[28/15] w-full" />
        </div>
      </div>

      <section aria-labelledby="why-heading" className="mt-14">
        <h2 id="why-heading" className="text-[1.625rem] font-extrabold tracking-[-0.02em]">
          What a listing gets you
        </h2>
        <ul className="mt-6 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
          {BENEFITS.map(([title, text]) => (
            <li key={title} className="border-t-2 border-ink pt-4">
              <h3 className="text-[1.125rem] font-extrabold tracking-[-0.01em]">{title}</h3>
              <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-soft">{text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section id="how" aria-labelledby="how-heading" className="mt-14 scroll-mt-6 rounded-3xl bg-mist px-6 py-9 sm:px-10 sm:py-12">
        <h2 id="how-heading" className="text-[1.625rem] font-extrabold tracking-[-0.02em]">
          How it works
        </h2>
        <ol className="mt-6 grid gap-8 md:grid-cols-3">
          {STEPS.map(([title, text], i) => (
            <li key={title}>
              <span aria-hidden="true" className="grid size-10 place-items-center rounded-full bg-ink text-[1rem] font-extrabold text-white tabular-nums">
                {i + 1}
              </span>
              <h3 className="mt-4 text-[1.125rem] font-extrabold tracking-[-0.01em]">{title}</h3>
              <p className="mt-1.5 max-w-[42ch] text-[0.9375rem] leading-relaxed text-ink-soft">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="need-heading" className="mt-14 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
        <div>
          <h2 id="need-heading" className="text-[1.625rem] font-extrabold tracking-[-0.02em]">
            What we need from you
          </h2>
          <ul className="mt-5 space-y-3 text-[1rem]">
            {NEEDS.map((need) => (
              <li key={need} className="flex gap-3">
                <span aria-hidden="true" className="mt-[0.55em] size-2 shrink-0 rounded-full bg-ink" />
                {need}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-[1.625rem] font-extrabold tracking-[-0.02em]">Already listed?</h2>
          <p className="mt-5 max-w-[52ch] text-[1rem] leading-relaxed text-ink-soft">
            We add trips we find on operators&apos; own websites, so yours may already be here. To correct a listing, add
            dates or have one removed, send the form with the changes and we&apos;ll update it.
          </p>
          <p className="mt-4">
            <Link href="/operators" className={LINK}>
              See the operators on Court Trips
            </Link>
          </p>
        </div>
      </section>

      <div className="mt-14 flex flex-col items-start gap-4 border-t border-rule pt-10 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-[40ch] text-[1.375rem] leading-tight font-extrabold tracking-[-0.02em]">Ready to add your trip?</p>
        <Link href="/list-your-program" className={`h-14 shrink-0 px-7 text-[1.0625rem] ${BTN_PRIMARY}`}>
          List your program
        </Link>
      </div>
    </main>
  );
}
