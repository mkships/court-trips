import Link from "next/link";
import { CheckCount, day, PageTitle, StateBadge } from "@/components/admin/bits";
import { programList, type ListingState } from "@/lib/admin/queries";
import { INPUT } from "@/components/submit/fields";

const TABS: [ListingState | undefined, string][] = [
  [undefined, "All"],
  ["live", "Live"],
  ["review", "In review"],
  ["archived", "Archived"],
];

export default async function ProgramsPage({ searchParams }: { searchParams: Promise<{ state?: string; q?: string }> }) {
  const { state: rawState, q } = await searchParams;
  const state = TABS.find(([s]) => s === rawState)?.[0];
  const rows = await programList({ state, q: q?.trim() || undefined });
  const href = (s?: ListingState) => `/admin/programs?${new URLSearchParams({ ...(s && { state: s }), ...(q && { q }) })}`;

  return (
    <div className="grid gap-6">
      <PageTitle title="Programs">
        <form className="flex gap-2" action="/admin/programs">
          {state && <input type="hidden" name="state" value={state} />}
          <input name="q" defaultValue={q} placeholder="Search name, operator or address" aria-label="Search programs" className={`${INPUT} w-72`} />
        </form>
      </PageTitle>
      <nav aria-label="Filter programs" className="flex flex-wrap gap-2">
        {TABS.map(([s, label]) => (
          <Link
            key={label}
            href={href(s)}
            aria-current={s === state ? "page" : undefined}
            className="rounded-full border border-rule bg-white px-4 py-1.5 text-[0.9375rem] font-semibold transition-colors hover:border-ink hover:bg-mist aria-[current=page]:border-ink aria-[current=page]:bg-ink aria-[current=page]:text-white"
          >
            {label}
          </Link>
        ))}
      </nav>
      {rows.length === 0 ? (
        <p className="rounded-2xl bg-white px-5 py-6 text-ink-soft">No programs match.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-white">
          <table className="w-full text-left text-[0.9375rem]">
            <thead className="border-b border-rule text-[0.8125rem] text-ink-soft">
              <tr>
                <th className="px-5 py-3 font-semibold">Program</th>
                <th className="px-3 py-3 font-semibold">State</th>
                <th className="px-3 py-3 font-semibold">Dates</th>
                <th className="px-3 py-3 font-semibold">Checks</th>
                <th className="px-5 py-3 font-semibold">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {rows.map((p) => {
                const upcoming = p.sessions.filter((s) => s.startDate >= new Date().toISOString().slice(0, 10)).length;
                return (
                  <tr key={p.id} className="transition-colors hover:bg-mist/70">
                    <td className="px-5 py-3">
                      <Link href={`/admin/programs/${p.slug}`} className="font-semibold underline decoration-transparent decoration-[1.5px] underline-offset-4 transition-colors hover:decoration-ink">
                        {p.title}
                      </Link>
                      <span className="block text-[0.875rem] text-ink-soft">
                        {p.organizer} · {p.cityRegion ?? p.country}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <StateBadge state={p.state} />
                    </td>
                    <td className="px-3 py-3 text-ink-soft">{upcoming ? `${upcoming} upcoming` : p.scheduleNotes ? "Seasonal" : "None upcoming"}</td>
                    <td className="px-3 py-3">
                      <CheckCount checks={p.checks} />
                    </td>
                    <td className="px-5 py-3 text-ink-soft">{day(p.updatedAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
