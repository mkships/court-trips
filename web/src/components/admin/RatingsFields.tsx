import { ErrorText, INPUT } from "@/components/submit/fields";

// Public ratings on other sites, one row per site. Leave a row blank to show nothing for that site.
// The inputs are read by ratingsFromForm (src/lib/admin/forms.ts).

export type EditableRating = { source: string; rating: number; reviewCount: number | null; url: string; checkedAt: string };

const SOURCES = [
  ["google", "Google"],
  ["trustpilot", "Trustpilot"],
  ["tripadvisor", "Tripadvisor"],
] as const;

export function RatingsFields({ ratings, error }: { ratings: EditableRating[]; error?: string }) {
  return (
    <section className="grid gap-5 rounded-3xl bg-white p-5 sm:p-7">
      <div>
        <h2 className="text-[1.125rem] font-extrabold">Ratings</h2>
        <p className="mt-0.5 max-w-[70ch] text-[0.9375rem] text-ink-soft">
          Their public score on each site, copied from that site, with a link to where the reviews can be read. The site shows the
          score and links out; it doesn&apos;t copy review text. Changing a row marks it as checked today.
        </p>
      </div>
      <div className="grid gap-3">
        {SOURCES.map(([source, label]) => {
          const r = ratings.find((x) => x.source === source);
          return (
            <fieldset key={source} className="grid grid-cols-2 items-end gap-3 sm:grid-cols-[8rem_7rem_8rem_1fr]">
              <legend className="sr-only">{label}</legend>
              <p className="col-span-2 text-[0.9375rem] font-semibold sm:col-span-1 sm:pb-2.5">
                {label}
                {r && <span className="block text-[0.8125rem] font-normal text-ink-soft">Checked {r.checkedAt}</span>}
              </p>
              <label className="block text-[0.875rem] text-ink-soft">
                Score out of 5
                <input name={`rating_${source}`} type="number" min={0} max={5} step="0.1" inputMode="decimal" defaultValue={r?.rating ?? ""} className={`mt-1 text-ink ${INPUT}`} />
              </label>
              <label className="block text-[0.875rem] text-ink-soft">
                Reviews
                <input name={`rating_count_${source}`} type="number" min={0} step="1" inputMode="numeric" defaultValue={r?.reviewCount ?? ""} className={`mt-1 text-ink ${INPUT}`} />
              </label>
              <label className="col-span-2 block text-[0.875rem] text-ink-soft sm:col-span-1">
                Link to their {label} page
                <input name={`rating_url_${source}`} type="text" inputMode="url" autoCapitalize="none" spellCheck={false} defaultValue={r?.url ?? ""} className={`mt-1 text-ink ${INPUT}`} />
              </label>
            </fieldset>
          );
        })}
      </div>
      <ErrorText name="ratings" error={error} />
    </section>
  );
}
