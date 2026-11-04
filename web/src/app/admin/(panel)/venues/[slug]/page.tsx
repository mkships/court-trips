import Link from "next/link";
import { notFound } from "next/navigation";
import { ChecksPanel, StateBadge } from "@/components/admin/bits";
import { VenueEditor } from "@/components/admin/VenueEditor";
import { venue as getVenue } from "@/lib/admin/queries";

export default async function EditVenuePage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ saved?: string }> }) {
  const [{ slug }, { saved }] = await Promise.all([params, searchParams]);
  const v = await getVenue(slug);
  if (!v) notFound();
  return (
    <div className="grid gap-6">
      <div>
        <Link href="/admin/venues" className="text-[0.9375rem] font-semibold text-ink-soft hover:text-ink">
          All venues
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-[1.75rem] leading-tight font-black tracking-[-0.03em]">{v.name}</h1>
          <StateBadge state={v.state} />
        </div>
        {v.programs.length > 0 && (
          <p className="mt-1 text-[0.9375rem] text-ink-soft">
            Programs here:{" "}
            {v.programs.map((p, i) => (
              <span key={p.slug}>
                {i > 0 && ", "}
                <Link href={`/admin/programs/${p.slug}`} className="font-semibold text-ink underline decoration-ink/30 underline-offset-4 hover:decoration-ink">
                  {p.title}
                </Link>
              </span>
            ))}
          </p>
        )}
      </div>
      {saved && <p className="rounded-2xl bg-white px-5 py-3 text-[0.9375rem]">Saved.</p>}
      <ChecksPanel checks={v.checks} />
      <VenueEditor venue={v} />
    </div>
  );
}
