import Link from "next/link";
import { CurrencyPicker } from "@/components/Currency";
import { SPORTS, SPORT_NAMES } from "@/lib/sports";
import { BTN_DARK } from "@/lib/ui";
import { Wordmark } from "./Wordmark";

const FOOT_LINK = "text-white/75 underline decoration-transparent decoration-[1.5px] underline-offset-4 transition-colors hover:text-white hover:decoration-white/60";

const COLUMNS: { title: string; links: [string, string][] }[] = [
  {
    title: "Explore",
    links: [
      ...SPORTS.map((sport): [string, string] => [`/trips?sport=${sport}`, `${SPORT_NAMES[sport]} trips`]),
      ["/resorts", "Resorts & clubs"],
      ["/operators", "Operators"],
    ],
  },
  {
    title: "Formats",
    links: [
      ["/trips?format=camp", "Camps"],
      ["/trips?format=clinic", "Clinics"],
      ["/trips?format=social_getaway", "Getaways"],
    ],
  },
  {
    title: "For operators",
    links: [
      ["/for-operators", "How listing works"],
      ["/list-your-program", "List your program"],
    ],
  },
];

// The reversed theme: ink, with the wordmark's yellow "court". `on-surface` turns focus rings yellow.
export function Footer() {
  return (
    // a trip page's fixed booking bar (phones) would cover the last lines, so leave room for it
    <footer className="on-surface mt-28 bg-ink text-white md:mt-32 [body:has([data-booking-bar])_&]:pb-20 lg:[body:has([data-booking-bar])_&]:pb-0">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-8">
        <div className="-mt-10 flex flex-col gap-4 rounded-3xl bg-ball px-6 py-6 text-ink sm:flex-row sm:items-center sm:justify-between sm:px-9">
          <div>
            <p className="text-[1.375rem] leading-tight font-extrabold tracking-[-0.02em]">Run a camp, clinic or getaway?</p>
            <p className="mt-1 text-[0.9375rem]">List it free. Players book with you directly and we never take a cut.</p>
          </div>
          <Link href="/for-operators" className={`shrink-0 px-6 py-3 text-[1rem] ${BTN_DARK}`}>
            List your program
          </Link>
        </div>

        <div className="grid gap-10 pt-12 pb-12 md:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
          <div className="max-w-[40ch]">
            <Wordmark reversed className="h-[28px] w-auto" />
            <p className="mt-4 text-[0.9375rem] leading-relaxed text-white/75">
              Tennis, pickleball and padel trips, worldwide. Compare dates and prices here, then book directly with the
              operators who run them.
            </p>
            <CurrencyPicker dark className="mt-5" />
          </div>
          {COLUMNS.map((column) => (
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
    </footer>
  );
}
