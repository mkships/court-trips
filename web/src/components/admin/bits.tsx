import type { Check } from "@/lib/admin/checks";
import type { ListingState } from "@/lib/admin/queries";

// Small pieces shared by the admin pages.

const STATE: Record<ListingState, { label: string; className: string }> = {
  live: { label: "Live", className: "bg-ok-soft text-ok-ink" },
  review: { label: "In review", className: "bg-warn-soft text-warn-ink" },
  archived: { label: "Archived", className: "bg-rule text-ink-soft" },
};

export function StateBadge({ state }: { state: ListingState }) {
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-[0.8125rem] font-semibold ${STATE[state].className}`}>{STATE[state].label}</span>;
}

// "2 errors · 1 warning", or a tick when there's nothing to fix
export function CheckCount({ checks }: { checks: Check[] }) {
  const errors = checks.filter((c) => c.level === "error").length;
  const warnings = checks.length - errors;
  if (!checks.length) return <span className="text-[0.875rem] text-ok-ink">All checks pass</span>;
  return (
    <span className="text-[0.875rem]">
      {errors > 0 && (
        <span className="font-semibold text-alert">
          {errors} {errors === 1 ? "error" : "errors"}
        </span>
      )}
      {errors > 0 && warnings > 0 && <span className="text-ink-soft"> · </span>}
      {warnings > 0 && (
        <span className="text-warn-ink">
          {warnings} {warnings === 1 ? "warning" : "warnings"}
        </span>
      )}
    </span>
  );
}

export function ChecksPanel({ checks }: { checks: Check[] }) {
  if (!checks.length)
    return <p className="rounded-2xl bg-ok-soft px-5 py-3 text-[0.9375rem] font-semibold text-ok-ink">All automatic checks pass.</p>;
  return (
    <ul className="grid gap-1.5 rounded-2xl border border-rule bg-white px-5 py-4 text-[0.9375rem]" aria-label="Automatic checks">
      {checks.map((c, i) => (
        <li key={i} className="flex items-baseline gap-2.5">
          <span
            aria-hidden="true"
            className={`size-2 shrink-0 translate-y-[-1px] rounded-full ${c.level === "error" ? "bg-alert" : "bg-warn"}`}
          />
          <span>
            <span className="sr-only">{c.level === "error" ? "Error: " : "Warning: "}</span>
            {c.message}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function PageTitle({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <h1 className="text-[1.75rem] font-black tracking-[-0.03em]">{title}</h1>
      {children}
    </div>
  );
}

export const day = (d: Date | string | null) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "";
