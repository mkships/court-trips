import Link from "next/link";
import { SPORTS, SPORT_NAMES } from "@/lib/sports";
import { Wordmark } from "./Wordmark";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-rule md:mt-24">
      <div className="mx-auto grid max-w-[1280px] gap-10 px-4 py-12 sm:px-8 md:grid-cols-[1fr_auto]">
        <div className="max-w-[46ch]">
          <Wordmark className="h-[24px] w-auto" />
          <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-soft">
            Tennis, pickleball and padel trips, worldwide. You book directly with the operators who run them.
          </p>
        </div>
        <nav aria-label="Browse">
          <p className="text-[0.8125rem] font-extrabold">Browse</p>
          <ul className="mt-3 space-y-2 text-[0.9375rem]">
            {SPORTS.map((sport) => (
              <li key={sport}>
                <Link href={`/?sport=${sport}`} className="underline decoration-transparent underline-offset-4 transition-colors hover:decoration-ink">
                  {SPORT_NAMES[sport]} trips
                </Link>
              </li>
            ))}
            <li>
              <Link href="/?type=places" className="underline decoration-transparent underline-offset-4 transition-colors hover:decoration-ink">
                Places to stay
              </Link>
            </li>
            <li>
              <Link href="/operators" className="underline decoration-transparent underline-offset-4 transition-colors hover:decoration-ink">
                Operators
              </Link>
            </li>
            <li>
              <Link href="/list-your-program" className="underline decoration-transparent underline-offset-4 transition-colors hover:decoration-ink">
                List your program
              </Link>
            </li>
          </ul>
        </nav>
      </div>
      <p className="mx-auto max-w-[1280px] px-4 pb-10 text-[0.8125rem] leading-relaxed text-ink-soft sm:px-8">
        Dates and prices come from each operator and can change. Photos belong to the operators named on each
        listing. © 2026 Court Trips.
      </p>
    </footer>
  );
}
