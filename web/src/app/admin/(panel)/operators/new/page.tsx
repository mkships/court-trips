import Link from "next/link";
import { createOrganization } from "@/app/admin/(panel)/actions";
import { OrganizationEditor } from "@/components/admin/OrganizationEditor";
import { organizationOptions } from "@/lib/admin/organizations";

export default async function NewOperatorPage() {
  const options = await organizationOptions();
  return (
    <div className="grid gap-6">
      <div>
        <Link href="/admin/operators?tab=leads" className="text-[0.9375rem] font-semibold text-ink-soft hover:text-ink">
          All operators
        </Link>
        <h1 className="mt-2 text-[1.75rem] leading-tight font-black tracking-[-0.03em]">Add an operator or lead</h1>
        <p className="mt-1 max-w-[70ch] text-[0.9375rem] text-ink-soft">
          Someone worth listing who isn&apos;t yet: say where you saw them and what to check. Operators with listings are added automatically when a listing names them.
        </p>
      </div>
      <OrganizationEditor
        organization={{ slug: "", name: "", kind: "operator", status: "lead", website: null, description: null, country: null, sports: [], aliases: [], note: null, sourceUrl: null, seenOnId: null }}
        action={createOrganization}
        marketplaces={options.filter((m) => m.kind === "marketplace")}
        submitLabel="Add"
      />
    </div>
  );
}
