import { SURFACES } from "@/lib/surfaces";
import { STAY_NAMES, levelLabel, nights } from "@/lib/format";
import type { ProgramDetail, Sport } from "@/lib/sports";

type Session = ProgramDetail["sessions"][number] | null;
type Fact = { value: string; label: string };

// One box per fact, so the court never shows an empty box.
const COLUMNS: Record<number, string> = { 1: "sm:grid-cols-1", 2: "sm:grid-cols-2", 3: "sm:grid-cols-3", 4: "sm:grid-cols-4" };

// The four things people compare between programs, laid out like the boxes of a court.
export function CourtFacts({ program, session, sport }: { program: ProgramDetail; session: Session; sport: Sport }) {
  const facts = pickFacts(program, session).slice(0, 4);
  if (facts.length === 0) return null;

  return (
    <div className="rounded-[22px] p-3 sm:p-4" style={{ backgroundColor: SURFACES[sport].surround }}>
      <dl
        className={`grid grid-cols-2 gap-[2px] bg-white p-[2px] ${COLUMNS[facts.length]}`}
        aria-label="Key facts"
      >
        {facts.map((f, i) => (
          <div
            key={f.label}
            className={`flex flex-col-reverse px-4 py-5 text-white sm:px-5 ${
              facts.length % 2 === 1 && i === facts.length - 1 ? "col-span-2 sm:col-span-1" : ""
            }`}
            style={{ backgroundColor: SURFACES[sport].court }}
          >
            <dt className="mt-1 text-[0.875rem] text-white">{f.label}</dt>
            <dd className="text-[1.5rem] leading-tight font-extrabold tracking-[-0.02em]">{f.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function pickFacts(p: ProgramDetail, session: Session): Fact[] {
  const facts: Fact[] = [];
  if (p.coachingHours) facts.push({ value: `${p.coachingHours} hours`, label: "of coaching" });
  if (p.ratio) facts.push({ value: `${p.ratio.split(":")[0]}${p.ratio.endsWith("+") ? "+" : ""} players`, label: "per coach" });

  const stayed = p.accommodation === "on_site_resort" || p.accommodation === "partner_hotel" || p.accommodation === "villa";
  const n = session ? nights(session.start, session.end) : 0;
  if (stayed && n > 0) facts.push({ value: `${n} ${n === 1 ? "night" : "nights"}`, label: STAY_NAMES[p.accommodation!].toLowerCase() });
  else if (session) {
    const days = n + 1;
    facts.push({ value: `${days} ${days === 1 ? "day" : "days"}`, label: p.accommodation ? STAY_NAMES[p.accommodation].toLowerCase() : "on court" });
  }

  const r = p.ratings;
  const rating = r.dupr_min != null ? `DUPR ${r.dupr_min}–${r.dupr_max}` : r.ntrp_min != null ? `NTRP ${r.ntrp_min}–${r.ntrp_max}` : null;
  facts.push({ value: levelLabel(p.level), label: rating ?? "playing level" });
  if (p.surfaces.length) facts.push({ value: p.surfaces.join(" and "), label: "courts" });
  return facts;
}
