import Link from "next/link";
import { day, PageTitle } from "@/components/admin/bits";
import { INPUT } from "@/components/submit/fields";
import { organizationList, organizationTabCounts, ORGANIZATION_TABS, type OrganizationTab } from "@/lib/admin/organizations";
import { SPORT_NAMES, type Sport } from "@/lib/sports";
import { BTN_DARK } from "@/lib/ui";

const TABS = Object.entries(ORGANIZATION_TABS) as [OrganizationTab, { label: string }][];

const INTRO: Record<OrganizationTab, string> = {
  operators: "Who runs the programmes: academies, coaches, resorts running their own weeks, tour operators. Each one with a live listing has a page at /operators.",
  leads: "Operators we know of but haven't listed: only sold on a marketplace, a site the harvest can't read, or dates not out yet. The note says what to check.",
  marketplaces:
    "Sites that list other organisers' programmes. Marketplaces take the booking or payment (BookRetreats, Weebora); directories link out (TennisTraveller). Never listed or featured themselves; a listing names one only when its operator books only through it.",
  archived: "Hidden from everything.",
};

const host = (url: string | null) => {
  try {
    return url ? new URL(url).hostname.replace(/^www\./, "") : null;
  } catch {
    return null;
  }
};

export default async function OperatorsPage({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string }> }) {
  const { tab: rawTab, q } = await searchParams;
  const tab: OrganizationTab = rawTab && rawTab in ORGANIZATION_TABS ? (rawTab as OrganizationTab) : "operators";
  const [rows, counts] = await Promise.all([organizationList(tab, q?.trim() || undefined), organizationTabCounts()]);
  const href = (t: OrganizationTab) => `/admin/operators?${new URLSearchParams({ tab: t, ...(q && { q }) })}`;

  return (
    <div className="grid gap-6">
      <PageTitle title="Operators">
        <div className="flex flex-wrap gap-2">
          <form className="flex gap-2" action="/admin/operators">
            <input type="hidden" name="tab" value={tab} />
            <input name="q" defaultValue={q} placeholder="Search names" aria-label="Search operators" className={`${INPUT} w-60`} />
          </form>
          <Link href="/admin/operators/new" className={`px-4 py-2.5 ${BTN_DARK}`}>
            Add a lead
          </Link>
        </div>
      </PageTitle>
      <nav aria-label="Kinds" className="flex flex-wrap gap-2">
        {TABS.map(([t, { label }]) => (
          <Link
            key={t}
            href={href(t)}
            aria-current={t === tab ? "page" : undefined}
            className="rounded-full border border-rule bg-white px-4 py-1.5 text-[0.9375rem] font-semibold transition-colors hover:border-ink aria-[current=page]:border-ink aria-[current=page]:bg-ink aria-[current=page]:text-white"
          >
            {label} <span className="font-normal opacity-70">{counts[t]}</span>
          </Link>
        ))}
      </nav>
      <p className="max-w-[70ch] text-[0.9375rem] text-ink-soft">{INTRO[tab]}</p>
      {rows.length === 0 ? (
        <p className="rounded-2xl bg-white px-5 py-6 text-ink-soft">Nothing here{q ? " matches" : " yet"}.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-white">
          <table className="w-full text-left text-[0.9375rem]">
            <thead className="border-b border-rule text-[0.8125rem] text-ink-soft">
              <tr>
                <th className="px-5 py-3 font-semibold">Name</th>
                <th className="px-3 py-3 font-semibold">{tab === "marketplaces" ? "Sells" : "Listings"}</th>
                <th className="px-3 py-3 font-semibold">{tab === "leads" ? "Note" : "Website"}</th>
                <th className="px-5 py-3 font-semibold">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {rows.map((o) => (
                <tr key={o.id} className="align-top transition-colors hover:bg-mist/70">
                  <td className="px-5 py-3">
                    <Link href={`/admin/operators/${o.slug}`} className="font-semibold hover:underline">
                      {o.name}
                    </Link>
                    <span className="block text-[0.875rem] text-ink-soft">
                      {[o.country, o.sports.map((s) => SPORT_NAMES[s as Sport] ?? s).join(", ") || null, o.seenOn && `seen on ${o.seenOn}`].filter(Boolean).join(" · ")}
                    </span>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-ink-soft">
                    {o.kind === "marketplace" ? o.sold : o.listings ? `${o.live} live of ${o.listings}` : "None"}
                  </td>
                  <td className="max-w-[46ch] px-3 py-3 text-[0.875rem] text-ink-soft">
                    {tab === "leads" ? (o.note ?? "") : host(o.website) ?? ""}
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap text-ink-soft">{day(o.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
