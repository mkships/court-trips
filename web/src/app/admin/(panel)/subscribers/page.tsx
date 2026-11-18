import { desc, sql } from "drizzle-orm";
import { day, PageTitle } from "@/components/admin/bits";
import { subscribers, type SUBSCRIBER_STATUSES } from "@/db/schema";
import { adminDb } from "@/lib/admin/queries";
import { SPORTS, SPORT_NAMES, type Sport } from "@/lib/sports";
import { BTN_DARK } from "@/lib/ui";

const LABELS: Record<(typeof SUBSCRIBER_STATUSES)[number], string> = {
  confirmed: "Confirmed",
  pending: "Not confirmed yet",
  unsubscribed: "Unsubscribed",
};

const SHOWN = 200;

// The email list: how big it is, which sports people play and where they signed up.
// Only confirmed addresses may be mailed; the CSV has those alone.
export default async function SubscribersPage() {
  const d = adminDb();
  const [byStatus, bySport, bySource, recent] = await Promise.all([
    d.select({ status: subscribers.status, n: sql<number>`count(*)::int` }).from(subscribers).groupBy(subscribers.status),
    d
      .select({ sport: sql<string>`unnest(${subscribers.sports})`, n: sql<number>`count(*)::int` })
      .from(subscribers)
      .where(sql`${subscribers.status} = 'confirmed'`)
      .groupBy(sql`1`),
    d
      .select({ source: subscribers.source, n: sql<number>`count(*)::int` })
      .from(subscribers)
      .where(sql`${subscribers.status} = 'confirmed'`)
      .groupBy(subscribers.source)
      .orderBy(sql`2 desc`)
      .limit(10),
    d.select().from(subscribers).orderBy(desc(subscribers.createdAt)).limit(SHOWN),
  ]);
  const count = (status: string) => byStatus.find((r) => r.status === status)?.n ?? 0;
  const sportCount = (sport: string) => bySport.find((r) => r.sport === sport)?.n ?? 0;

  return (
    <div className="grid gap-6">
      <PageTitle title="Subscribers">
        <a href="/admin/subscribers.csv" className={`px-4 py-2.5 ${BTN_DARK}`}>
          Download confirmed (CSV)
        </a>
      </PageTitle>

      <dl className="grid gap-3 sm:grid-cols-3">
        {(["confirmed", "pending", "unsubscribed"] as const).map((status) => (
          <div key={status} className="rounded-2xl bg-white px-5 py-4">
            <dt className="text-[0.875rem] text-ink-soft">{LABELS[status]}</dt>
            <dd className="text-[2rem] leading-tight font-black tracking-[-0.03em] tabular-nums">{count(status)}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-3 sm:grid-cols-2">
        <section className="rounded-2xl bg-white px-5 py-4">
          <h2 className="font-extrabold">Sports, of confirmed</h2>
          <p className="mt-1 text-[0.875rem] text-ink-soft">People can tick several; anyone who ticks none hears about all three.</p>
          <ul className="mt-3 grid gap-1.5 text-[0.9375rem]">
            {SPORTS.map((sport) => (
              <li key={sport} className="flex justify-between gap-4">
                <span>{SPORT_NAMES[sport]}</span>
                <span className="tabular-nums">{sportCount(sport)}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-2xl bg-white px-5 py-4">
          <h2 className="font-extrabold">Signed up on, of confirmed</h2>
          {bySource.length === 0 ? (
            <p className="mt-3 text-[0.9375rem] text-ink-soft">No one yet.</p>
          ) : (
            <ul className="mt-3 grid gap-1.5 text-[0.9375rem]">
              {bySource.map((r) => (
                <li key={r.source ?? ""} className="flex justify-between gap-4">
                  <span className="truncate">{r.source ?? "Unknown"}</span>
                  <span className="tabular-nums">{r.n}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {recent.length === 0 ? (
        <p className="rounded-2xl bg-white px-5 py-6 text-ink-soft">No sign-ups yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-white">
          <table className="w-full text-left text-[0.9375rem]">
            <caption className="px-5 pt-4 text-left text-[0.875rem] text-ink-soft">
              The latest {Math.min(recent.length, SHOWN)}, newest first
            </caption>
            <thead className="border-b border-rule text-[0.8125rem] text-ink-soft">
              <tr>
                <th className="px-5 py-3 font-semibold">Email</th>
                <th className="px-3 py-3 font-semibold">Status</th>
                <th className="px-3 py-3 font-semibold">Sports</th>
                <th className="px-3 py-3 font-semibold">Signed up on</th>
                <th className="px-5 py-3 font-semibold">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {recent.map((s) => (
                <tr key={s.id} className="align-top">
                  <td className="px-5 py-3 break-all">{s.email}</td>
                  <td className="px-3 py-3 whitespace-nowrap text-ink-soft">{LABELS[s.status]}</td>
                  <td className="px-3 py-3 text-ink-soft">
                    {s.sports.length ? s.sports.map((x) => SPORT_NAMES[x as Sport] ?? x).join(", ") : "All"}
                  </td>
                  <td className="px-3 py-3 text-ink-soft">{s.source ?? ""}</td>
                  <td className="px-5 py-3 whitespace-nowrap text-ink-soft">{day(s.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
