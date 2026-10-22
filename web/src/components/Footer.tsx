import Link from "next/link";
import { SPORTS, SPORT_NAMES } from "@/lib/sports";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-rule">
      <div className="mx-auto grid max-w-[1280px] gap-10 px-4 py-12 sm:px-8 md:grid-cols-[1fr_auto]">
        <div className="max-w-[46ch]">
          <p className="text-[1.25rem] font-black tracking-[-0.03em]">Court Trips</p>
          <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-soft">
            Tennis, pickleball and padel trips from operators around the world. You book directly with the operator;
            Court Trips doesn&apos;t take payment.
          </p>
        </div>
        <nav aria-label="Browse">
          <p className="text-[0.8125rem] font-extrabold">Browse</p>
          <ul className="mt-3 space-y-2 text-[0.9375rem]">
            {SPORTS.map((sport) => (
              <li key={sport}>
                <Link href={`/?sport=${sport}`} className="hover:underline">
                  {SPORT_NAMES[sport]} trips
                </Link>
              </li>
            ))}
            <li>
              <Link href="/?type=places" className="hover:underline">
                Places to stay
              </Link>
            </li>
          </ul>
        </nav>
      </div>
      <p className="mx-auto max-w-[1280px] px-4 pb-10 text-[0.8125rem] leading-relaxed text-ink-soft sm:px-8">
        Dates and prices are checked against each operator&apos;s site and can change. Photos belong to the operators
        named on each listing. © 2026 Court Trips.
      </p>
    </footer>
  );
}
