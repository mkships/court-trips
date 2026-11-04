import Link from "next/link";
import { CheckCount, day, PageTitle } from "@/components/admin/bits";
import { pendingSubmissions, programList, programsWithChanges, recentlyReviewedSubmissions, venueList } from "@/lib/admin/queries";
import { CATEGORY_NAMES } from "@/lib/format";

// Everything waiting for a decision: operator submissions first (someone is waiting on a reply),
// then draft and flagged programs, then venues.
export default async function QueuePage({ searchParams }: { searchParams: Promise<{ rejected?: string }> }) {
  const [subs, allInReview, changed, places, reviewed, { rejected }] = await Promise.all([
    pendingSubmissions(),
    programList({ state: "review" }),
    programsWithChanges(),
    venueList("review"),
    recentlyReviewedSubmissions(5),
    searchParams,
  ]);
  // a program with proposed changes is listed once, under them
  const progs = allInReview.filter((p) => !p.pendingChanges);
  const empty = subs.length + progs.length + places.length + changed.length === 0;

  return (
    <div className="grid gap-10">
      <PageTitle title="Review queue" />
      {rejected && <p className="rounded-2xl bg-white px-5 py-3 text-[0.9375rem]">Submission rejected.</p>}
      {empty && <p className="rounded-2xl bg-white px-5 py-6 text-ink-soft">Nothing waiting for review.</p>}

      {subs.length > 0 && (
        <Section title="Operator submissions" count={subs.length} intro="Sent through “List your program”. Turn one into a draft to edit it, or reject it.">
          {subs.map((s) => (
            <Row
              key={s.id}
              href={`/admin/submissions/${s.id}`}
              title={s.data.core_identity.title}
              meta={[s.data.core_identity.organizer, s.data.location.country, CATEGORY_NAMES[s.data.categorization.category]]}
              aside={<span className="text-[0.875rem] text-ink-soft">Sent {day(s.createdAt)}</span>}
            />
          ))}
        </Section>
      )}

      {changed.length > 0 && (
        <Section title="Proposed changes" count={changed.length} intro="A harvest found something different on the operator's site. Nothing here has changed on Court Trips yet.">
          {changed.map((p) => (
            <Row
              key={p.id}
              href={`/admin/programs/${p.slug}`}
              title={p.title}
              meta={[
                p.organizer,
                p.pendingChanges?.missing ? "No longer on the operator's page" : null,
                ...Object.keys(p.pendingChanges?.fields ?? {}).map((f) => f.replace(/_/g, " ")),
                p.pendingChanges?.sessions ? "dates" : null,
              ]}
              aside={<span className="text-[0.875rem] text-ink-soft">Found {day(p.pendingChanges?.foundAt ?? null)}</span>}
            />
          ))}
        </Section>
      )}

      {progs.length > 0 && (
        <Section title="Programs" count={progs.length} intro="Drafts and listings flagged for a look. Publishing puts one on the site straight away.">
          {progs.map((p) => (
            <Row
              key={p.id}
              href={`/admin/programs/${p.slug}`}
              title={p.title}
              meta={[p.organizer, p.cityRegion ?? p.country, p.submissions.length ? "From a submission" : p.sourceUrl ? "Harvested" : null]}
              aside={<CheckCount checks={p.checks} />}
            />
          ))}
        </Section>
      )}

      {places.length > 0 && (
        <Section title="Venues" count={places.length}>
          {places.map((v) => (
            <Row key={v.id} href={`/admin/venues/${v.slug}`} title={v.name} meta={[v.kind, v.cityRegion ?? v.country]} aside={<CheckCount checks={v.checks} />} />
          ))}
        </Section>
      )}

      {reviewed.length > 0 && (
        <Section title="Recently reviewed submissions">
          {reviewed.map((s) => (
            <Row
              key={s.id}
              href={s.program ? `/admin/programs/${s.program.slug}` : `/admin/submissions/${s.id}`}
              title={s.data.core_identity.title}
              meta={[s.data.core_identity.organizer, s.status === "approved" ? "Made into a draft" : "Rejected"]}
              aside={<span className="text-[0.875rem] text-ink-soft">{day(s.reviewedAt)}</span>}
            />
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({ title, count, intro, children }: { title: string; count?: number; intro?: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-[1.125rem] font-extrabold">
        {title}
        {count != null && <span className="ml-2 text-ink-soft">{count}</span>}
      </h2>
      {intro && <p className="mt-0.5 text-[0.9375rem] text-ink-soft">{intro}</p>}
      <ul className="mt-3 divide-y divide-rule overflow-hidden rounded-2xl bg-white">{children}</ul>
    </section>
  );
}

function Row({ href, title, meta, aside }: { href: string; title: string; meta: (string | null | undefined)[]; aside?: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="flex flex-wrap items-center gap-x-6 gap-y-1 px-5 py-3.5 transition-colors hover:bg-mist/70">
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{title}</span>
          <span className="block truncate text-[0.875rem] text-ink-soft">{meta.filter(Boolean).join(" · ")}</span>
        </span>
        {aside}
      </Link>
    </li>
  );
}
