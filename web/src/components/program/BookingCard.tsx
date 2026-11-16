import Link from "next/link";
import { CalendarIcon, ExternalIcon, MoonIcon, StoreIcon } from "@/components/icons";
import { ListedPrice, Money } from "@/components/Currency";
import { PRICE_UNIT_NAMES, SESSION_STATUS as STATUS, dateRange, hostOf, nights } from "@/lib/format";
import { BTN_PRIMARY, LINK, PILL } from "@/lib/ui";
import type { ProgramDetail } from "@/lib/sports";

type Session = ProgramDetail["sessions"][number] | null;
const SHOWN_DATES = 4;

// The button names the action; what it books (dates, operator) is in the summary above it.
function cta(session: Session) {
  if (!session) return "Ask about dates";
  if (session.status === "sold_out") return "See other dates";
  if (session.status === "waitlist") return "Join the waitlist";
  if (session.bookingUrl) return "Book these dates";
  return "Check availability";
}

const goHref = (program: ProgramDetail, session: Session) =>
  `/go/${program.slug}${session ? `?date=${session.start}` : ""}`;

// the selected date's price, in the operator's currency
function price(program: ProgramDetail, session: Session) {
  const amount = session?.price ?? program.priceMin;
  return amount != null && program.currency ? { amount, currency: program.currency } : null;
}

// "3 nights" for stays, "1 day" or "3 days" otherwise
function length(program: ProgramDetail, s: NonNullable<Session>) {
  const n = nights(s.start, s.end);
  const stays = program.accommodation && program.accommodation !== "self_arranged" && program.accommodation !== "not_included";
  if (stays && n > 0) return `${n} ${n === 1 ? "night" : "nights"}`;
  return `${n + 1} ${n === 0 ? "day" : "days"}`;
}

function SummaryRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <span className="text-ink-soft">{icon}</span>
      <dt className="text-[0.9375rem] text-ink-soft">{label}</dt>
      <dd className="ml-auto text-right text-[0.9375rem] font-semibold">{children}</dd>
    </div>
  );
}

export function BookingCard({ program, session }: { program: ProgramDetail; session: Session }) {
  const amount = price(program, session);
  const others = program.sessions.length;

  return (
    <div className="rounded-3xl p-6 shadow-card ring-1 ring-ink/5">
      {amount ? (
        <p>
          <span className="text-[1.75rem] font-black tracking-[-0.02em]">
            <Money {...amount} />
          </span>{" "}
          <span className="text-ink-soft">{program.priceUnit ? PRICE_UNIT_NAMES[program.priceUnit] : ""}</span>
        </p>
      ) : (
        <p className="text-[1.25rem] font-extrabold">Price on request</p>
      )}
      {amount && <ListedPrice {...amount} className="mt-1 text-[0.8125rem] text-ink-soft" />}

      {others > 0 ? (
        <div className="mt-5">
          <p className="text-[0.8125rem] font-extrabold">Choose dates</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {program.sessions.slice(0, SHOWN_DATES).map((s) => {
              const on = s.start === session?.start;
              return (
                <li key={s.start}>
                  <Link
                    href={`?date=${s.start}`}
                    scroll={false}
                    aria-current={on ? "true" : undefined}
                    className={`px-3.5 py-1.5 text-[0.9375rem] font-medium ${PILL} ${s.status === "sold_out" ? "line-through decoration-1" : ""}`}
                  >
                    {dateRange({ start: s.start, end: s.end, scheduleNotes: null })}
                  </Link>
                </li>
              );
            })}
          </ul>
          {others > SHOWN_DATES && (
            <a href="#dates" className={`mt-3 inline-block text-[0.9375rem] ${LINK}`}>
              All {others} dates
            </a>
          )}
        </div>
      ) : (
        <p className="mt-4 text-[0.9375rem] text-ink-soft">{program.scheduleNotes ?? "Dates on request."}</p>
      )}

      {/* what the button books, like the summary before a checkout */}
      <dl aria-label="Your trip" className="mt-5 divide-y divide-rule border-y border-rule">
        {session && (
          <>
            <SummaryRow icon={<CalendarIcon />} label="Dates">
              {dateRange({ start: session.start, end: session.end, scheduleNotes: null })}
            </SummaryRow>
            <SummaryRow icon={<MoonIcon />} label="Length">
              {length(program, session)}
            </SummaryRow>
            <SummaryRow icon={<span className={`m-[5px] block size-2.5 rounded-full ${STATUS[session.status].dot}`} />} label="Availability">
              {STATUS[session.status].label}
            </SummaryRow>
          </>
        )}
        <SummaryRow icon={<StoreIcon />} label="Book with">
          {/* a marketplace takes the booking for the operator, so say both */}
          {program.soldThrough ? `${program.soldThrough}, for ${program.organizer}` : program.organizer}
        </SummaryRow>
      </dl>

      <a href={goHref(program, session)} rel="nofollow" className={`mt-5 flex min-h-14 w-full px-6 py-3 text-[1.0625rem] ${BTN_PRIMARY}`}>
        {cta(session)}
        <ExternalIcon className="size-[18px]" />
      </a>
      <p className="mt-3 text-center text-[0.8125rem] text-ink-soft">
        You&apos;ll book and pay on {hostOf(session?.bookingUrl ?? program.bookingUrl)}.
      </p>
    </div>
  );
}

export function MobileBookingBar({ program, session }: { program: ProgramDetail; session: Session }) {
  const amount = price(program, session);
  return (
    <div data-booking-bar className="fixed inset-x-0 bottom-0 z-20 flex items-center gap-4 border-t border-rule bg-white px-4 py-3 lg:hidden">
      <div className="min-w-0 flex-1">
        <p className="truncate font-extrabold">{amount ? <Money {...amount} /> : "Price on request"}</p>
        <a href="#dates" className="block truncate text-[0.875rem] text-ink-soft underline decoration-ink-soft/40 decoration-[1.5px] underline-offset-4 transition-colors hover:text-ink hover:decoration-ink">
          {session ? dateRange({ start: session.start, end: session.end, scheduleNotes: null }) : "Dates on request"}
        </a>
      </div>
      <a
        href={goHref(program, session)}
        rel="nofollow"
        className={`shrink-0 px-5 py-3 text-[0.9375rem] ${BTN_PRIMARY}`}
      >
        {cta(session)}
      </a>
    </div>
  );
}
