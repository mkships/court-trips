import Link from "next/link";
import { notFound } from "next/navigation";
import { ChecksPanel, day, StateBadge } from "@/components/admin/bits";
import { ProgramEditor } from "@/components/admin/ProgramEditor";
import { program as getProgram, venueOptions } from "@/lib/admin/queries";
import { photoUrl } from "@/lib/photos";

export default async function EditProgramPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ from?: string; saved?: string }> }) {
  const [{ slug }, { from, saved }] = await Promise.all([params, searchParams]);
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
      <ChecksPanel checks={p.checks} />
      <ProgramEditor
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
