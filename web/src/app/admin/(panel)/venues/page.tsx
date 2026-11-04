import Link from "next/link";
import { CheckCount, day, PageTitle, StateBadge } from "@/components/admin/bits";
import { venueList } from "@/lib/admin/queries";

export default async function VenuesPage() {
  const rows = await venueList();
  return (
    <div className="grid gap-6">
      <PageTitle title="Venues" />
      {rows.length === 0 ? (
        <p className="rounded-2xl bg-white px-5 py-6 text-ink-soft">No venues yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-white">
          <table className="w-full text-left text-[0.9375rem]">
            <thead className="border-b border-rule text-[0.8125rem] text-ink-soft">
              <tr>
                <th className="px-5 py-3 font-semibold">Venue</th>
                <th className="px-3 py-3 font-semibold">State</th>
                <th className="px-3 py-3 font-semibold">Programs</th>
                <th className="px-3 py-3 font-semibold">Checks</th>
                <th className="px-5 py-3 font-semibold">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {rows.map((v) => (
                <tr key={v.id} className="transition-colors hover:bg-mist/70">
                  <td className="px-5 py-3">
                    <Link href={`/admin/venues/${v.slug}`} className="font-semibold hover:underline">
                      {v.name}
                    </Link>
                    <span className="block text-[0.875rem] text-ink-soft capitalize">
                      {v.kind} · {v.cityRegion ?? v.country}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <StateBadge state={v.state} />
                  </td>
                  <td className="px-3 py-3 text-ink-soft">{v.programs.length}</td>
                  <td className="px-3 py-3">
                    <CheckCount checks={v.checks} />
                  </td>
                  <td className="px-5 py-3 text-ink-soft">{day(v.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
