import type { Mode, Sport, SportStats } from "@/lib/sports";

const LEVELS = ["Beginner", "Intermediate", "Advanced", "All levels"];
const FORMATS = [
  { value: "camp", label: "Camp" },
  { value: "clinic", label: "Clinic" },
  { value: "social_getaway", label: "Getaway" },
];

function monthLabel(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function SearchBar({ mode, sport, stats }: { mode: Mode; sport: Sport; stats: SportStats }) {
  return (
    <form
      action="/search"
      method="get"
      className="relative z-10 mt-3 grid grid-cols-1 rounded-[24px] bg-white p-2 shadow-[0_10px_30px_-12px_rgba(22,35,58,0.45)] ring-1 ring-ink/5 md:mx-6 md:-mt-11 md:grid-cols-[1.4fr_1fr_1fr_1fr_auto] md:items-center md:rounded-full"
    >
      <input type="hidden" name="sport" value={sport} />
      <input type="hidden" name="type" value={mode} />

      <Field label="Where">
        <input
          name="where"
          list="where-options"
          placeholder="Any country"
          autoComplete="off"
          className="w-full bg-transparent text-ink placeholder:text-ink-soft focus:outline-none"
        />
        <datalist id="where-options">
          {stats.countries.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </Field>

      <Field label="When">
        <Select name="month" placeholder="Any month">
          {stats.months.map((m) => (
            <option key={m} value={m}>
              {monthLabel(m)}
            </option>
          ))}
        </Select>
      </Field>

      {mode === "programs" ? (
        <>
          <Field label="Level">
            <Select name="level" placeholder="Any level">
              {LEVELS.map((l) => (
                <option key={l} value={l.toLowerCase()}>
                  {l}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Format">
            <Select name="format" placeholder="Any format">
              {FORMATS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </Select>
          </Field>
        </>
      ) : (
        <>
          <Field label="Guests">
            <Select name="guests" placeholder="Add guests">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? "guest" : "guests"}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Courts">
            <Select name="courts" placeholder="Any surface">
              <option value="hard">Hard</option>
              <option value="clay">Clay</option>
              <option value="grass">Grass</option>
              <option value="artificial_turf">Artificial turf</option>
            </Select>
          </Field>
        </>
      )}

      <button
        type="submit"
        className="mt-2 flex h-14 items-center justify-center gap-2 rounded-full bg-ball px-7 text-[1rem] font-extrabold text-ink hover:brightness-95 md:mt-0 md:ml-2"
      >
        <SearchIcon />
        Search
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="relative block cursor-pointer rounded-full px-6 py-3 hover:bg-rule/50 focus-within:bg-rule/50 md:[&+&]:before:absolute md:[&+&]:before:inset-y-3 md:[&+&]:before:left-0 md:[&+&]:before:w-px md:[&+&]:before:bg-rule">
      <span className="block text-[0.8125rem] font-extrabold">{label}</span>
      <span className="block text-[0.9375rem]">{children}</span>
    </label>
  );
}

function Select({
  name,
  placeholder,
  children,
}: {
  name: string;
  placeholder: string;
  children: React.ReactNode;
}) {
  return (
    <select
      name={name}
      defaultValue=""
      className="w-full cursor-pointer appearance-none bg-transparent text-ink focus:outline-none [&:has(option[value='']:checked)]:text-ink-soft"
    >
      <option value="">{placeholder}</option>
      {children}
    </select>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-[18px] w-[18px]" aria-hidden="true">
      <circle cx="8.5" cy="8.5" r="6" fill="none" stroke="currentColor" strokeWidth="2.4" />
      <path d="m13 13 5 5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}
