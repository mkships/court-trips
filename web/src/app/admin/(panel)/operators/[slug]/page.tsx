import Link from "next/link";
import { notFound } from "next/navigation";
import { mergeOrganization, saveOrganization } from "@/app/admin/(panel)/actions";
import { StateBadge } from "@/components/admin/bits";
import { OrganizationEditor } from "@/components/admin/OrganizationEditor";
import { INPUT } from "@/components/submit/fields";
import { organization as getOrganization, organizationOptions } from "@/lib/admin/organizations";
import { programState } from "@/lib/admin/queries";
import { BTN_OUTLINE } from "@/lib/ui";

const KIND_LABEL = { operator: "Operator", marketplace: "Marketplace" } as const;
const STATUS_LABEL = { active: "Active", lead: "Lead", archived: "Archived" } as const;

export default async function EditOperatorPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ saved?: string; merged?: string; merge?: string }>;
}) {
  const [{ slug }, { saved, merged, merge }] = await Promise.all([params, searchParams]);
  const [o, options] = await Promise.all([getOrganization(slug), organizationOptions()]);
  if (!o) notFound();
  const live = o.programs.filter((p) => programState(p) === "live");
  const listings = o.kind === "marketplace" ? o.sold : o.programs;

  return (
    <div className="grid gap-6">
      <div>
        <Link href={`/admin/operators?tab=${o.status === "lead" ? "leads" : o.kind === "marketplace" ? "marketplaces" : o.status === "archived" ? "archived" : "operators"}`} className="text-[0.9375rem] font-semibold text-ink-soft hover:text-ink">
          All operators
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-[1.75rem] leading-tight font-black tracking-[-0.03em]">{o.name}</h1>
          <span className="rounded-full bg-mist px-2.5 py-0.5 text-[0.8125rem] font-semibold">{KIND_LABEL[o.kind]}</span>
          <span className="rounded-full bg-mist px-2.5 py-0.5 text-[0.8125rem] font-semibold">{STATUS_LABEL[o.status]}</span>
        </div>
        {o.kind === "operator" && o.status === "active" && live.length > 0 && (
          <p className="mt-1 text-[0.9375rem] text-ink-soft">
            Public page:{" "}
            <Link href={`/operators/${o.slug}`} className="font-semibold text-ink underline decoration-ink/30 underline-offset-4 hover:decoration-ink">
              /operators/{o.slug}
            </Link>
          </p>
        )}
        {o.seenOn && <p className="mt-1 text-[0.9375rem] text-ink-soft">Seen on {o.seenOn.name}.</p>}
      </div>
      {(saved || merged) && <p className="rounded-2xl bg-white px-5 py-3 text-[0.9375rem]">{merged ? "Merged: its listings and names are here now." : "Saved."}</p>}
      {merge === "none" && <p className="rounded-2xl border-2 border-alert bg-white px-5 py-3 text-[0.9375rem] font-semibold text-alert">Pick another record to merge into.</p>}

      <section className="grid gap-3 rounded-[20px] bg-white p-5 sm:p-7">
        <h2 className="text-[1.125rem] font-extrabold">{o.kind === "marketplace" ? "Listings sold only through it" : "Listings"}</h2>
        {listings.length === 0 ? (
          <p className="text-[0.9375rem] text-ink-soft">None yet.</p>
        ) : (
          <ul className="grid gap-2">
            {listings.map((p) => (
              <li key={p.slug} className="flex flex-wrap items-center gap-3 text-[0.9375rem]">
                <Link href={`/admin/programs/${p.slug}`} className="font-semibold hover:underline">
                  {p.title}
                </Link>
                <StateBadge state={programState(p)} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <OrganizationEditor
        organization={o}
        action={saveOrganization.bind(null, o.id)}
        marketplaces={options.filter((m) => m.kind === "marketplace")}
      />

      <section className="grid gap-3 rounded-[20px] bg-white p-5 sm:p-7">
        <h2 className="text-[1.125rem] font-extrabold">Same organisation as another record?</h2>
        <p className="max-w-[70ch] text-[0.9375rem] text-ink-soft">
          Merging moves this one&apos;s listings to the record you pick, keeps &ldquo;{o.name}&rdquo; there as another name so future imports link to it, and removes this one.
        </p>
        <form action={mergeOrganization.bind(null, o.id)} className="flex flex-wrap gap-3">
          <select name="into" required aria-label="Merge into" defaultValue="" className={`${INPUT} w-auto min-w-64`}>
            <option value="" disabled>
              Merge into…
            </option>
            {options
              .filter((x) => x.id !== o.id)
              .map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                  {x.kind === "marketplace" ? " (marketplace)" : x.status === "lead" ? " (lead)" : ""}
                </option>
              ))}
          </select>
          <button type="submit" className={`px-5 py-2.5 ${BTN_OUTLINE}`}>
            Merge
          </button>
        </form>
      </section>
    </div>
  );
}
