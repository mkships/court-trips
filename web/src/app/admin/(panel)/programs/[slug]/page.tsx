import Link from "next/link";
import { notFound } from "next/navigation";
import { applyPendingChanges, dismissPendingChanges } from "@/app/admin/(panel)/actions";
import { ChecksPanel, day, StateBadge } from "@/components/admin/bits";
import { ProgramEditor } from "@/components/admin/ProgramEditor";
import { program as getProgram, venueOptions } from "@/lib/admin/queries";
import { dateRange } from "@/lib/format";
import { photoUrl } from "@/lib/photos";
import { BTN_OUTLINE, BTN_PRIMARY } from "@/lib/ui";

export default async function EditProgramPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ from?: string; saved?: string; applied?: string; dismissed?: string }> }) {
  const [{ slug }, { from, saved, applied, dismissed }] = await Promise.all([params, searchParams]);
  const [p, venues] = await Promise.all([getProgram(slug), venueOptions()]);
  if (!p) notFound();

  return (
    <div className="grid gap-6">
      <div>
        <Link href="/admin/programs" className="text-[0.9375rem] font-semibold text-ink-soft hover:text-ink">
          All programs
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-[1.75rem] leading-tight font-black tracking-[-0.03em]">{p.title}</h1>
          <StateBadge state={p.state} />
        </div>
        <p className="mt-1 text-[0.9375rem] text-ink-soft">
          {p.organizer} · updated {day(p.updatedAt)}
          {p.sourceUrl && (
            <>
              {" · "}
              <a href={p.sourceUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-ink underline decoration-ink/30 underline-offset-4 hover:decoration-ink">
                Source page
              </a>
            </>
          )}
          {p.state === "live" && (
            <>
              {" · "}
              <a href={`/programs/${p.slug}`} target="_blank" className="font-semibold text-ink underline decoration-ink/30 underline-offset-4 hover:decoration-ink">
                Public page
              </a>
            </>
          )}
          {p.submissions[0] && (
            <>
              {" · "}
              <Link href={`/admin/submissions/${p.submissions[0].id}`} className="font-semibold text-ink underline decoration-ink/30 underline-offset-4 hover:decoration-ink">
                Original submission
              </Link>
            </>
          )}
        </p>
      </div>
      {from === "submission" && (
        <p className="rounded-2xl bg-white px-5 py-3 text-[0.9375rem]">Made a draft from the submission. Check it over, then publish.</p>
      )}
      {saved && <p className="rounded-2xl bg-white px-5 py-3 text-[0.9375rem]">Saved.</p>}
      {applied && <p className="rounded-2xl bg-white px-5 py-3 text-[0.9375rem]">Applied the proposed changes.</p>}
      {dismissed && <p className="rounded-2xl bg-white px-5 py-3 text-[0.9375rem]">Dismissed. The next harvest proposes them again if the operator&apos;s page still differs.</p>}
      {p.pendingChanges && <Proposal id={p.id} changes={p.pendingChanges} />}
      <ChecksPanel checks={p.checks} />
      <ProgramEditor
        // a new form after a proposal is applied or dismissed: its fields start from the database again
        key={`${applied ?? ""}${dismissed ?? ""}`}
        program={{
          ...p,
          sessions: p.sessions.map((s) => ({ ...s })),
          photos: p.photos.map((ph) => ({ id: ph.id, url: photoUrl(ph.path) })),
        }}
        venues={venues}
      />
    </div>
  );
}

const show = (v: unknown) => {
  if (v == null || v === "") return "(empty)";
  if (Array.isArray(v)) return v.length ? v.join(", ") : "(none)";
  const text = String(v);
  return text.length > 160 ? `${text.slice(0, 160)}…` : text;
};
const dates = (list: { start_date: string; end_date: string }[]) =>
  list.length ? list.map((s) => dateRange({ start: s.start_date, end: s.end_date, scheduleNotes: null })).join(" · ") : "(none)";

// What a harvest found that differs from the listing, for a person to apply or dismiss.
function Proposal({ id, changes }: { id: string; changes: NonNullable<Awaited<ReturnType<typeof getProgram>>>["pendingChanges"] & {} }) {
  const fields = Object.entries(changes.fields ?? {});
  const hasEdits = fields.length > 0 || Boolean(changes.sessions);
  return (
    <section className="grid gap-4 rounded-[20px] border-2 border-[#e0a100] bg-white p-5 sm:p-7">
      <div>
        <h2 className="text-[1.125rem] font-extrabold">The operator&apos;s site has changed</h2>
        <p className="mt-0.5 text-[0.9375rem] text-ink-soft">Found by the harvest on {day(changes.foundAt)}. Nothing below is on Court Trips until you apply it.</p>
      </div>
      {changes.missing && (
        <p className="text-[0.9375rem]">
          <strong>No longer listed:</strong> the last two harvests didn&apos;t find this program on the operator&apos;s page. If it&apos;s gone,
          archive it; if it&apos;s still running, dismiss this.
        </p>
      )}
      {hasEdits && (
        <dl className="grid gap-x-6 gap-y-2 text-[0.9375rem] sm:grid-cols-[160px_1fr]">
          {fields.map(([field, c]) => (
            <div key={field} className="contents">
              <dt className="text-ink-soft first-letter:uppercase">{field.replace(/_/g, " ")}</dt>
              <dd>
                <span className="text-ink-soft line-through">{show(c.from)}</span> <span aria-hidden="true">→</span>{" "}
                <span className="font-semibold">{show(c.to)}</span>
              </dd>
            </div>
          ))}
          {changes.sessions && (
            <div className="contents">
              <dt className="text-ink-soft">Upcoming dates</dt>
              <dd>
                <span className="text-ink-soft line-through">{dates(changes.sessions.from as { start_date: string; end_date: string }[])}</span>{" "}
                <span aria-hidden="true">→</span> <span className="font-semibold">{dates(changes.sessions.to)}</span>
              </dd>
            </div>
          )}
        </dl>
      )}
      <div className="flex flex-wrap gap-3">
        {hasEdits && (
          <form action={applyPendingChanges.bind(null, id)}>
            <button type="submit" className={`px-5 py-2.5 ${BTN_PRIMARY}`}>
              Apply {changes.missing ? "the changes" : "these changes"}
            </button>
          </form>
        )}
        <form action={dismissPendingChanges.bind(null, id)}>
          <button type="submit" className={`px-5 py-2.5 ${BTN_OUTLINE}`}>
            Dismiss
          </button>
        </form>
      </div>
    </section>
  );
}
