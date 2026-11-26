import Link from "next/link";
import { CurrencyPicker } from "@/components/Currency";
import { NewsletterForm } from "@/components/NewsletterForm";
import { inCountry } from "@/lib/country-info";
import { getHomeData } from "@/lib/db";
import { busiest, landingHref } from "@/lib/landing";
import { SPORTS, SPORT_NAMES } from "@/lib/sports";
import { NEWSLETTER_TURNSTILE_ACTION, turnstileSiteKey } from "@/lib/turnstile";
import { BTN_DARK, PAGE } from "@/lib/ui";
import { Logo } from "./Logo";

const FOOT_LINK = "text-white/75 underline decoration-transparent decoration-[1.5px] underline-offset-4 transition-colors hover:text-white hover:decoration-white/60";

type Column = { title: string; links: [string, string][] };

const EXPLORE: Column = {
  title: "Explore",
  links: [
    ...SPORTS.map((sport): [string, string] => [`/${sport}`, `${SPORT_NAMES[sport]} trips`]),
    ["/resorts", "Resorts & clubs"],
    ["/operators", "Operators"],
    ["/newsletter", "New trips by email"],
  ],
};
const FOR_OPERATORS: Column = {
  title: "For operators",
  links: [
    ["/for-operators", "How listing works"],
    ["/list-your-program", "List your program"],
  ],
};
// how many sport-and-country pages the footer names; the rest are a click away on /destinations
const TOP_DESTINATIONS = 5;

// The sport-and-country pages with the most trips ("Padel in Spain"), so every page links to them.
async function destinations(): Promise<Column> {
  const { listings } = await getHomeData();
  const places = busiest("place", listings).slice(0, TOP_DESTINATIONS);
  return {
    title: "Destinations",
    links: [
      ...places.map(({ page }): [string, string] => [landingHref(page), `${SPORT_NAMES[page.sport]} ${inCountry(page.country)}`]),
      ["/destinations", "All destinations"],
    ],
  };
}

// The reversed theme: ink, with the white emblem and the wordmark's yellow "court". `on-surface` turns focus rings yellow.
export async function Footer() {
  const columns = [EXPLORE, await destinations(), FOR_OPERATORS];
  return (
    <footer className="on-surface mt-20 text-white md:mt-24">
      {/* the band straddles the footer's top edge: the ink behind it starts halfway down, whatever its height */}
      <div className="relative">
        <div aria-hidden="true" className="absolute inset-x-0 top-1/2 bottom-0 bg-ink" />
        <div className={`relative ${PAGE}`}>
          <div className="flex flex-col gap-4 rounded-3xl bg-ball px-6 py-7 text-ink sm:flex-row sm:items-center sm:justify-between sm:px-9">
          <div>
            <p className="text-[1.375rem] leading-tight font-extrabold tracking-[-0.02em]">Run a camp, clinic or getaway?</p>
            <p className="mt-1 text-[0.9375rem]">List it free. Players book with you directly and we never take a cut.</p>
          </div>
          <Link href="/for-operators" className={`shrink-0 px-6 py-3 text-[1rem] ${BTN_DARK}`}>
              List your program
            </Link>
          </div>
        </div>
      </div>

      {/* a trip page's fixed booking bar (phones) would cover the last lines, so leave room for it */}
      <div className="bg-ink [body:has([data-booking-bar])_&]:pb-20 lg:[body:has([data-booking-bar])_&]:pb-0">
       <div className={PAGE}>
        <div className="grid gap-10 pt-12 pb-12 md:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
          <div className="max-w-[40ch]">
            {/* pulled left and up by the lockup's own clear space, so the artwork lines up with the text */}
            <Logo layout="stacked" reversed className="-mt-3.5 -ml-4 w-[144px]" />
            <p className="mt-1 text-[0.9375rem] leading-relaxed text-white/75">
              Tennis, pickleball and padel trips, worldwide. Compare dates and prices here, then book directly with the
              operators who run them.
            </p>
            <p className="mt-6 text-[0.8125rem] font-extrabold text-ball">New trips, once a month</p>
            <NewsletterForm siteKey={turnstileSiteKey()} action={NEWSLETTER_TURNSTILE_ACTION} dark className="mt-3" />
            <CurrencyPicker dark up className="mt-6" />
          </div>
          {columns.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <p className="text-[0.8125rem] font-extrabold text-ball">{column.title}</p>
              <ul className="mt-3 space-y-2.5 text-[0.9375rem]">
                {column.links.map(([href, label]) => (
                  <li key={href}>
                    <Link href={href} className={FOOT_LINK}>
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <p className="border-t border-white/15 py-6 text-[0.8125rem] leading-relaxed text-white/60">
          Dates and prices come from each operator and can change. Converted prices are a guide; the operator charges in
          their own currency. Photos belong to the operators named on each listing. © 2026 Court Trips.
        </p>
       </div>
      </div>
    </footer>
  );
}
