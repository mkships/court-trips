import Link from "next/link";
import { dateRange, money } from "@/lib/format";
import type { ProgramDetail } from "@/lib/sports";

const STATUS = {
  available: { label: "Available", dot: "bg-[#2f9e5b]" },
  waitlist: { label: "Waitlist", dot: "bg-[#e0a100]" },
  sold_out: { label: "Sold out", dot: "bg-ink-soft/50" },
} as const;

export function DateTable({ program, selected }: { program: ProgramDetail; selected: string | null }) {
  if (program.sessions.length === 0) {
    return <p className="max-w-[65ch] text-[1rem]">{program.scheduleNotes ?? "Dates on request."}</p>;
  }
  return (
    <ul className="divide-y divide-rule border-y border-rule">
      {program.sessions.map((s) => {
        const isSelected = s.start === selected;
        return (
          <li key={s.start}>
            <Link
              href={`?date=${s.start}#dates`}
              scroll={false}
              aria-current={isSelected ? "true" : undefined}
              className={`grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-0.5 px-3 py-3.5 transition-colors hover:bg-mist sm:grid-cols-[1fr_8rem_7rem] ${
                isSelected ? "bg-mist shadow-[inset_3px_0_0_var(--color-ink)]" : ""
              } ${s.status === "sold_out" ? "text-ink-soft" : ""}`}
            >
              <span className="font-semibold">
                {dateRange({ start: s.start, end: s.end, scheduleNotes: null })}
                {isSelected && <span className="ml-2 text-[0.8125rem] font-normal text-ink-soft">Selected</span>}
              </span>
              <span className="order-3 flex items-center gap-2 text-[0.9375rem] text-ink-soft sm:order-none">
                <span aria-hidden="true" className={`size-2 rounded-full ${STATUS[s.status].dot}`} />
                {STATUS[s.status].label}
              </span>
              <span className="text-right font-semibold">
                {s.price != null && program.currency ? money(s.price, program.currency) : "Price on request"}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
