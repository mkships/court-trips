import Link from "next/link";
import { dateRange, money } from "@/lib/format";
import type { ProgramDetail } from "@/lib/sports";

const STATUS = { available: "Available", waitlist: "Waitlist", sold_out: "Sold out" } as const;

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
              className={`grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-0.5 px-3 py-4 hover:bg-rule/40 sm:grid-cols-[1fr_8rem_7rem] ${
                isSelected ? "bg-rule/60" : ""
              } ${s.status === "sold_out" ? "text-ink-soft" : ""}`}
            >
              <span className="font-semibold">
                {dateRange({ start: s.start, end: s.end, scheduleNotes: null })}
                {isSelected && <span className="ml-2 text-[0.8125rem] font-normal text-ink-soft">Selected</span>}
              </span>
              <span className="order-3 text-[0.9375rem] text-ink-soft sm:order-none">{STATUS[s.status]}</span>
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
