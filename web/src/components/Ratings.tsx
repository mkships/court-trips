import type { Rating } from "@/lib/sports";
import { BTN_OUTLINE } from "@/lib/ui";

export const RATING_SOURCE_NAMES: Record<Rating["source"], string> = { google: "Google", tripadvisor: "Tripadvisor" };

const monthYear = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });

export function Star({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden="true">
      <path d="M8 1.3l2 4.3 4.7.6-3.5 3.2.9 4.6L8 11.7 3.9 14l.9-4.6L1.3 6.2 6 5.6z" fill="currentColor" />
    </svg>
  );
}

// "4.8 on Google" for a card: the rating with the most reviews behind it.
export function topRating(ratings: Rating[]) {
  return [...ratings].sort((a, b) => (b.reviewCount ?? 0) - (a.reviewCount ?? 0))[0] ?? null;
}

// Ratings from other sites, each linking to where the reviews can be read when we have the link. We don't copy review text.
export function RatingBadges({ ratings, className = "" }: { ratings: Rating[]; className?: string }) {
  if (ratings.length === 0) return null;
  const checked = ratings.map((r) => r.checkedAt).sort()[0];
  return (
    <div className={className}>
      <ul className="flex flex-wrap gap-2">
        {ratings.map((r) => {
          const badge = (
            <>
              <Star className="size-4 text-warn" />
              <span className="font-extrabold">{r.rating.toFixed(1)}</span>
              <span className="font-normal text-ink-soft">
                on {RATING_SOURCE_NAMES[r.source]}
                {r.reviewCount ? ` · ${r.reviewCount.toLocaleString("en-US")} reviews` : ""}
              </span>
            </>
          );
          return (
            <li key={r.source}>
              {r.url ? (
                <a href={r.url} target="_blank" rel="noopener noreferrer" className={`py-1.5 pr-4 pl-3 text-[0.9375rem] ${BTN_OUTLINE}`}>
                  {badge}
                  <span className="sr-only">(opens {RATING_SOURCE_NAMES[r.source]})</span>
                </a>
              ) : (
                // no link entered: the same badge, but not a control, so it doesn't hover
                <span className="inline-flex items-center gap-2 rounded-full border border-rule bg-white py-1.5 pr-4 pl-3 text-[0.9375rem] font-semibold">{badge}</span>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-[0.8125rem] text-ink-soft">Ratings from the sites named, checked {monthYear(checked)}.</p>
    </div>
  );
}
