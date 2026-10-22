import Link from "next/link";
import { PRICE_UNIT_NAMES, dateRange, hostOf, money } from "@/lib/format";
import type { ProgramDetail } from "@/lib/sports";

type Session = ProgramDetail["sessions"][number] | null;
const SHOWN_DATES = 4;

// What the hand-off button says depends on what the operator lets us link to.
function cta(program: ProgramDetail, session: Session) {
  const org = program.organizer;
  if (!session) return { long: `Ask ${org} about dates`, short: "Ask about dates" };
  const when = dateRange({ start: session.start, end: session.end, scheduleNotes: null });
  if (session.status === "sold_out") return { long: `See other dates on ${org}`, short: "See other dates" };
  if (session.status === "waitlist") return { long: `Join the waitlist with ${org}`, short: "Join waitlist" };
  if (session.bookingUrl) return { long: `Book ${when} with ${org}`, short: "Book these dates" };
  return { long: `Check ${when} with ${org}`, short: "Check these dates" };
}

const goHref = (program: ProgramDetail, session: Session) =>
  `/go/${program.slug}${session ? `?date=${session.start}` : ""}`;

function price(program: ProgramDetail, session: Session) {
  const amount = session?.price ?? program.priceMin;
  return amount != null && program.currency ? money(amount, program.currency) : null;
}

export function BookingCard({ program, session }: { program: ProgramDetail; session: Session }) {
  const amount = price(program, session);
  const label = cta(program, session);
  const others = program.sessions.length;

  return (
    <div className="rounded-[24px] p-6 shadow-[0_10px_30px_-12px_rgba(22,35,58,0.35)] ring-1 ring-ink/5">
      {amount ? (
        <p>
          <span className="text-[1.75rem] font-black tracking-[-0.02em]">{amount}</span>{" "}
          <span className="text-ink-soft">{program.priceUnit ? PRICE_UNIT_NAMES[program.priceUnit] : ""}</span>
        </p>
      ) : (
        <p className="text-[1.25rem] font-extrabold">Price on request</p>
      )}

      {others > 0 ? (
        <div className="mt-5">
          <p className="text-[0.8125rem] font-extrabold">Dates</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {program.sessions.slice(0, SHOWN_DATES).map((s) => (
              <li key={s.start}>
                <Link
                  href={`?date=${s.start}`}
                  scroll={false}
                  aria-current={s.start === session?.start ? "true" : undefined}
                  className={`block rounded-full border px-3.5 py-1.5 text-[0.875rem] ${
                    s.start === session?.start ? "border-ink bg-ink text-white" : "border-rule hover:border-ink"
                  } ${s.status === "sold_out" ? "line-through decoration-1" : ""}`}
                >
                  {dateRange({ start: s.start, end: s.end, scheduleNotes: null })}
                </Link>
              </li>
            ))}
          </ul>
          {others > SHOWN_DATES && (
            <a href="#dates" className="mt-3 inline-block text-[0.875rem] font-semibold underline underline-offset-4">
              All {others} dates
            </a>
          )}
        </div>
      ) : (
        <p className="mt-4 text-[0.9375rem] text-ink-soft">{program.scheduleNotes ?? "Dates on request."}</p>
      )}

      <a
        href={goHref(program, session)}
        rel="nofollow"
        className="mt-6 flex min-h-14 items-center justify-center rounded-full bg-ball px-6 py-3 text-center text-[1rem] font-extrabold text-ink hover:brightness-95"
      >
        {label.long}
      </a>
      <p className="mt-3 text-center text-[0.8125rem] text-ink-soft">
        You&apos;ll finish on {hostOf(session?.bookingUrl ?? program.bookingUrl)}. Court Trips doesn&apos;t take payment.
      </p>
    </div>
  );
}

export function MobileBookingBar({ program, session }: { program: ProgramDetail; session: Session }) {
  const amount = price(program, session);
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 flex items-center gap-4 border-t border-rule bg-white px-4 py-3 lg:hidden">
      <div className="min-w-0 flex-1">
        <p className="truncate font-extrabold">{amount ?? "Price on request"}</p>
        <a href="#dates" className="block truncate text-[0.875rem] text-ink-soft underline underline-offset-2">
          {session ? dateRange({ start: session.start, end: session.end, scheduleNotes: null }) : "Dates on request"}
        </a>
      </div>
      <a
        href={goHref(program, session)}
        rel="nofollow"
        className="shrink-0 rounded-full bg-ball px-5 py-3 text-[0.9375rem] font-extrabold text-ink"
      >
        {cta(program, session).short}
      </a>
    </div>
  );
}
