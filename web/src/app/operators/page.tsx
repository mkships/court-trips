import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { OperatorCard, TILE_GRID } from "@/components/ListingRow";
import { getHomeData, getOperators } from "@/lib/db";
import { SPORTS, SPORT_NAMES, type Sport } from "@/lib/sports";

export const metadata: Metadata = {
  title: "Operators | Court Trips",
  description: "The academies, coaches, resorts and tour operators behind the tennis, pickleball and padel trips on Court Trips.",
};

export const revalidate = 3600;

export default async function OperatorsPage({ searchParams }: { searchParams: Promise<{ sport?: string }> }) {
  const { sport: raw } = await searchParams;
  const sport = SPORTS.find((s) => s === raw);
  const [operators, { listings }] = await Promise.all([getOperators(), getHomeData()]);
  const tilesOf = (slugs: string[]) => {
    const mine = new Set(slugs);
    return listings.filter((t) => mine.has(t.programSlug));
  };
  const shown = operators
    .map((o) => ({ operator: o, tiles: tilesOf(o.programSlugs) }))
    .filter(({ tiles }) => !sport || tiles.some((t) => t.sports.includes(sport)));

  return (
    <div className="on-paper">
      <Header />
      <main className="mx-auto max-w-[1280px] px-4 sm:px-8">
        <h1 className="mt-6 text-[2.25rem] leading-[1] font-black tracking-[-0.035em] sm:text-[3rem]">Operators</h1>
        <p className="mt-3 max-w-[60ch] text-[1.0625rem] leading-relaxed text-ink-soft">
          The academies, coaches, resorts and tour operators who run the trips on Court Trips. You book directly with them.
        </p>
        <nav aria-label="Sport" className="mt-6 flex flex-wrap gap-2">
          {[undefined, ...SPORTS].map((s) => (
            <Link
              key={s ?? "all"}
              href={s ? `/operators?sport=${s}` : "/operators"}
              aria-current={s === sport ? "page" : undefined}
              className="rounded-full border border-rule bg-white px-4 py-1.5 text-[0.9375rem] font-semibold transition-colors hover:border-ink aria-[current=page]:border-ink aria-[current=page]:bg-ink aria-[current=page]:text-white"
            >
              {s ? SPORT_NAMES[s as Sport] : "All sports"}
            </Link>
          ))}
        </nav>
        {shown.length === 0 ? (
          <p className="mt-10 text-ink-soft">No operators here yet.</p>
        ) : (
          <ul className={`mt-8 ${TILE_GRID}`}>
            {shown.map(({ operator, tiles }) => (
              <li key={operator.slug}>
                <OperatorCard operator={operator} tiles={tiles} />
              </li>
            ))}
          </ul>
        )}
      </main>
      <Footer />
    </div>
  );
}
