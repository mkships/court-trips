import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { ExternalIcon } from "@/components/icons";
import { ListingCard, TILE_GRID } from "@/components/ListingRow";
import { getHomeData, getOperator, getOperators } from "@/lib/db";
import { SPORTS, SPORT_NAMES, type Sport } from "@/lib/sports";
import { LINK } from "@/lib/ui";

type Props = { params: Promise<{ slug: string }> };

export const revalidate = 3600;

export async function generateStaticParams() {
  return (await getOperators()).map((o) => ({ slug: o.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const operator = await getOperator((await params).slug);
  if (!operator) return {};
  const title = `${operator.name}: trips and camps | Court Trips`;
  return { title, description: operator.description ?? `Tennis, pickleball and padel trips run by ${operator.name}.` };
}

const host = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

export default async function OperatorPage({ params }: Props) {
  const operator = await getOperator((await params).slug);
  if (!operator) notFound();
  const { listings } = await getHomeData();
  const mine = new Set(operator.programSlugs);
  const tiles = listings.filter((t) => mine.has(t.programSlug));
  // one card per programme, on its next date (tiles come soonest first)
  const cards = tiles.filter((t, i) => tiles.findIndex((u) => u.programSlug === t.programSlug) === i);
  const sports = SPORTS.filter((s) => tiles.some((t) => t.sports.includes(s)));
  const countries = [...new Set(tiles.map((t) => t.country).filter(Boolean))];

  return (
    <div className="on-paper">
      <Header />
      <main className="mx-auto max-w-[1280px] px-4 sm:px-8">
        <Link href="/operators" className="inline-flex items-center gap-1.5 text-[0.9375rem] font-semibold text-ink-soft transition-colors hover:text-ink">
          <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden="true">
            <path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          All operators
        </Link>
        <h1 className="mt-3 max-w-[22ch] text-[2.25rem] leading-[1] font-black tracking-[-0.035em] text-balance sm:text-[3rem]">{operator.name}</h1>
        <p className="mt-4 text-[0.9375rem] text-ink-soft">
          {[
            `${cards.length} ${cards.length === 1 ? "program" : "programs"}`,
            sports.map((s) => SPORT_NAMES[s as Sport]).join(", "),
            countries.join(", "),
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {operator.description && <p className="mt-5 max-w-[65ch] text-[1.0625rem] leading-relaxed">{operator.description}</p>}
        {operator.website && (
          <a href={operator.website} target="_blank" rel="noopener noreferrer" className={`mt-4 inline-flex items-center gap-1.5 text-[0.9375rem] ${LINK}`}>
            {host(operator.website)}
            <ExternalIcon className="size-4" />
          </a>
        )}
        <h2 className="mt-10 text-[1.375rem] font-extrabold tracking-[-0.02em]">Their trips</h2>
        <ul className={`mt-6 ${TILE_GRID}`}>
          {cards.map((t) => (
            <li key={t.key}>
              <ListingCard listing={t} sport={t.sports[0] as Sport} />
            </li>
          ))}
        </ul>
      </main>
      <Footer />
    </div>
  );
}
