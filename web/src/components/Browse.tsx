import Link from "next/link";
import { Court } from "@/components/Court";
import { searchHref, type SearchKey, type SearchValues } from "@/lib/filters";
import { SPORTS, SPORT_NAMES, type Mode, type Sport } from "@/lib/sports";
import { SURFACES } from "@/lib/surfaces";
import { BTN_OUTLINE, LINK, PILL } from "@/lib/ui";

// Shared pieces of the two listing pages (/trips and /resorts): sport pills, the removable
// filter chips, and what to show when nothing matches.

export const FORMAT_NOUNS: Record<string, [string, string]> = {
  camp: ["camp", "camps"],
  clinic: ["clinic", "clinics"],
  social_getaway: ["getaway", "getaways"],
};
export const SURFACE_NAMES: Record<string, string> = { Hard: "hard", Clay: "clay", Grass: "grass", "Artificial Turf": "artificial turf" };

// "in the United States", "in Greece"
const THE = /^(United |Dominican Republic|Czech Republic|Netherlands|Turks and Caicos|Bahamas|Philippines|Maldives)/;
export const inCountry = (c: string) => `in ${THE.test(c) ? "the " : ""}${c}`;

export const monthLabel = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
};

// Short labels for the removable filter chips.
export function chipLabel(key: SearchKey, value: string) {
  if (key === "month") return monthLabel(value);
  if (key === "format") return FORMAT_NOUNS[value]?.[0].replace(/^./, (c) => c.toUpperCase()) ?? value;
  if (key === "level") return value[0].toUpperCase() + value.slice(1);
  if (key === "courts") return `${SURFACE_NAMES[value] ?? value} courts`.replace(/^./, (c) => c.toUpperCase());
  return value;
}

// A typed place ("gree") that matches exactly one known country reads as that country.
export function resolveWhere(values: SearchValues, known: (string | null)[]) {
  if (!values.where) return;
  const typed = values.where.toLowerCase();
  const hits = [...new Set(known)].filter((c): c is string => !!c?.toLowerCase().includes(typed));
  if (hits.length === 1) values.where = hits[0];
}

type Common = { sport: Sport; mode: Mode; values: SearchValues };

export function SportPills({ sport, mode, values }: Common) {
  return (
    <nav aria-label="Sport" className="mt-8 flex flex-wrap gap-2">
      {SPORTS.map((s) => (
        <Link key={s} href={searchHref(s, mode, values)} aria-current={s === sport ? "page" : undefined} className={`px-4 py-1.5 text-[0.9375rem] ${PILL}`}>
          {SPORT_NAMES[s]}
        </Link>
      ))}
    </nav>
  );
}

export function FilterChips({ sport, mode, values, active }: Common & { active: [SearchKey, string][] }) {
  if (active.length === 0) return null;
  return (
    <ul className="mt-5 flex flex-wrap items-center gap-2" aria-label="Active filters">
      {active.map(([key, value]) => (
        <li key={key}>
          <Link
            href={searchHref(sport, mode, values, key)}
            aria-label={`Remove filter: ${chipLabel(key, value)}`}
            className="inline-flex items-center gap-2 rounded-full bg-mist py-1.5 pr-2.5 pl-3.5 text-[0.9375rem] font-semibold transition-colors hover:bg-rule"
          >
            {chipLabel(key, value)}
            <svg viewBox="0 0 12 12" className="size-2.5" aria-hidden="true">
              <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </Link>
        </li>
      ))}
      {active.length > 1 && (
        <li>
          <Link href={searchHref(sport, mode, {})} className={`inline-block px-1 py-1.5 text-[0.9375rem] ${LINK}`}>
            Clear all
          </Link>
        </li>
      )}
    </ul>
  );
}

export function Empty({ sport, mode, values, active }: Common & { active: [SearchKey, string][] }) {
  return (
    <section className="mt-8 grid items-center gap-8 rounded-3xl bg-mist p-6 sm:p-10 md:grid-cols-[1fr_280px]">
      <div>
        <p className="text-[1.25rem] font-extrabold">Nothing matches all of those filters.</p>
        {active.length > 0 ? (
          <>
            <p className="mt-2 max-w-[50ch] text-ink-soft">Remove one to see more:</p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {active.map(([key, value]) => (
                <li key={key}>
                  <Link href={searchHref(sport, mode, values, key)} className={`px-4 py-2 text-[0.9375rem] ${BTN_OUTLINE}`}>
                    Without {key === "where" ? value : chipLabel(key, value).toLowerCase()}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="mt-2 text-ink-soft">There are no {SPORT_NAMES[sport].toLowerCase()} listings yet. Try another sport.</p>
        )}
      </div>
      <div className="hidden rounded-2xl p-5 md:block" style={{ backgroundColor: SURFACES[sport].surround }}>
        <Court sport={sport} className="block aspect-[28/15] w-full" />
      </div>
    </section>
  );
}

export const H1 = "text-[2.25rem] leading-[1] font-black tracking-[-0.035em] text-balance sm:text-[3rem]";
export const H1_RESULTS = "mt-6 max-w-[30ch] text-[1.875rem] leading-[1.1] font-extrabold tracking-[-0.025em] text-balance sm:text-[2.25rem]";
export const CONTAINER = "mx-auto max-w-[1280px] px-4 sm:px-8";
