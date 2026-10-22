"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { SPORT_NAMES, type Listing, type Mode, type Sport, type Venue } from "@/lib/sports";
import { SURFACES } from "@/lib/surfaces";
import { matchesTile, type SearchKey, type SearchValues } from "@/lib/filters";

// Airbnb-style search: one pill of fields. Opening a field greys the bar, lifts that field
// out as a white pill and shows its panel underneath. Choosing an option moves to the next field.

type Key = SearchKey;
type Values = SearchValues;
type Option = { value: string; label: string; hint?: string };

const LEVELS: Option[] = [
  { value: "beginner", label: "Beginner", hint: "New to the sport, or coming back after a break" },
  { value: "intermediate", label: "Intermediate", hint: "You rally comfortably and know how to score" },
  { value: "advanced", label: "Advanced", hint: "You play matches or tournaments regularly" },
];
const FORMATS: Option[] = [
  { value: "camp", label: "Camp", hint: "Several days of structured training" },
  { value: "clinic", label: "Clinic", hint: "A day or a weekend of focused coaching" },
  { value: "social_getaway", label: "Getaway", hint: "A holiday with coaching and social play" },
];
const SURFACE_OPTIONS: Option[] = [
  { value: "Hard", label: "Hard" },
  { value: "Clay", label: "Clay" },
  { value: "Grass", label: "Grass" },
  { value: "Artificial Turf", label: "Artificial turf" },
];

const FIELDS: Record<Mode, { key: Key; label: string; empty: string }[]> = {
  programs: [
    { key: "where", label: "Where", empty: "Any country" },
    { key: "month", label: "When", empty: "Any time" },
    { key: "level", label: "Level", empty: "Any level" },
    { key: "format", label: "Format", empty: "Any format" },
  ],
  places: [
    { key: "where", label: "Where", empty: "Any country" },
    { key: "guests", label: "Guests", empty: "Add guests" },
    { key: "courts", label: "Courts", empty: "Any surface" },
  ],
};

const monthName = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-GB", { month: "long", timeZone: "UTC" });
};
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

const matches = matchesTile;

type Props = {
  mode: Mode;
  sport: Sport;
  tiles: Listing[];
  venues: Venue[];
  // a results page passes the current search so the bar shows it
  initial?: Values;
  // "hero" tucks the bar under the homepage hero; "page" sits in normal flow
  placement?: "hero" | "page";
};

export function SearchBar({ mode, sport, tiles, venues, initial = {}, placement = "hero" }: Props) {
  const fields = FIELDS[mode];
  const [values, setValues] = useState<Values>(initial);
  const [open, setOpen] = useState<Key | null>(null);
  const [query, setQuery] = useState(initial.where ?? "");
  const form = useRef<HTMLFormElement>(null);
  const id = useId();

  // close on outside click and Esc; Esc returns focus to the field that was open
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !form.current?.contains(e.target as Node) && setOpen(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      form.current?.querySelector<HTMLElement>(`[data-field="${open}"]`)?.focus();
      setOpen(null);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const countries = useMemo(() => {
    const byCountry = new Map<string, { items: Set<string>; places: Set<string> }>();
    const add = (country: string | null, key: string, place: string | null) => {
      if (!country) return;
      const entry = byCountry.get(country) ?? { items: new Set(), places: new Set() };
      entry.items.add(key);
      if (place && place !== country) entry.places.add(place.split(",")[0]);
      byCountry.set(country, entry);
    };
    if (mode === "programs") tiles.filter((t) => matches(t, values, "where")).forEach((t) => add(t.country, t.programSlug, t.place));
    else venues.forEach((v) => add(v.country, v.slug, v.place));
    return [...byCountry]
      .map(([country, e]) => ({ country, count: e.items.size, places: [...e.places].slice(0, 2) }))
      .sort((a, b) => b.count - a.count || a.country.localeCompare(b.country));
  }, [mode, tiles, venues, values]);

  // every month with a session for this sport, counted under the other filters (0 = dimmed)
  const months = useMemo(() => {
    const byMonth = new Map<string, Set<string>>();
    for (const t of tiles) {
      if (!t.start) continue;
      const m = t.start.slice(0, 7);
      const set = byMonth.get(m) ?? new Set<string>();
      if (matches(t, values, "month")) set.add(t.programSlug);
      byMonth.set(m, set);
    }
    return [...byMonth].sort(([a], [b]) => a.localeCompare(b)).map(([month, s]) => ({ month, count: s.size }));
  }, [tiles, values]);

  // programs per option of a field, under the other filters
  const countFor = (key: Key, options: Option[]) => {
    const pool = tiles.filter((t) => matches(t, values, key));
    const programs = (list: Listing[]) => new Set(list.map((t) => t.programSlug)).size;
    const counts: Record<string, number> = { "": programs(pool) };
    for (const o of options) counts[o.value] = programs(pool.filter((t) => matches(t, { [key]: o.value }, "where")));
    return counts;
  };

  const set = (key: Key, value: string | undefined) => {
    setValues((v) => ({ ...v, [key]: value }));
    if (key === "where") setQuery(value ?? "");
  };
  // choosing moves on to the next field, like Airbnb; the last field closes
  const choose = (key: Key, value: string | undefined) => {
    set(key, value);
    const next = fields[fields.findIndex((f) => f.key === key) + 1];
    setOpen(next ? next.key : null);
    if (next) requestAnimationFrame(() => form.current?.querySelector<HTMLElement>(`[data-field="${next.key}"]`)?.focus());
  };

  const display = (key: Key): string | undefined => {
    const v = values[key];
    if (!v) return undefined;
    if (key === "month") return `${monthName(v)} ${v.slice(0, 4)}`;
    if (key === "level") return LEVELS.find((o) => o.value === v)?.label;
    if (key === "format") return FORMATS.find((o) => o.value === v)?.label;
    if (key === "courts") return SURFACE_OPTIONS.find((o) => o.value === v)?.label;
    if (key === "guests") return plural(Number(v), "guest");
    return v;
  };

  const active = open !== null;
  const openIndex = fields.findIndex((f) => f.key === open);

  return (
    <form
      ref={form}
      action="/search"
      method="get"
      onSubmit={() => setOpen(null)}
      className={`relative z-30 mt-3 flex flex-col rounded-[28px] shadow-[0_10px_30px_-12px_rgba(22,35,58,0.45)] ring-1 ring-ink/5 transition-colors md:flex-row ${placement === "hero" ? "md:mx-6 md:-mt-9" : ""} md:items-stretch md:rounded-full ${
        active ? "bg-mist" : "bg-white"
      }`}
    >
      <input type="hidden" name="sport" value={sport} />
      <input type="hidden" name="type" value={mode} />
      {fields.map((f) => values[f.key] && f.key !== "where" && <input key={f.key} type="hidden" name={f.key} value={values[f.key]} />)}

      {fields.map((f, i) => {
        const isOpen = open === f.key;
        const last = i === fields.length - 1;
        const shown = display(f.key);
        return (
          <div
            key={f.key}
            style={{ order: i * 2 }}
            data-open={isOpen || undefined}
            className={[
              "relative flex min-w-0 items-center rounded-[28px] transition-[background-color,box-shadow] md:rounded-full",
              f.key === "where" ? "md:flex-[1.3]" : last ? "md:flex-[1.75]" : "md:flex-1",
              isOpen ? "bg-white shadow-[0_8px_24px_-10px_rgba(22,35,58,0.45)]" : active ? "hover:bg-rule/70" : "hover:bg-mist",
              // hairline dividers, faded beside the open or hovered field
              i > 0 ? "md:before:absolute md:before:inset-y-4 md:before:left-0 md:before:w-px md:before:bg-rule md:before:transition-opacity" : "",
              "data-[open]:before:opacity-0 hover:before:opacity-0 [[data-open]+&]:before:opacity-0 [:hover+&]:before:opacity-0",
            ].join(" ")}
          >
            {f.key === "where" ? (
              <label className="block flex-1 cursor-pointer py-3.5 pr-10 pl-7 md:pl-8">
                <span className="block text-[0.75rem] font-extrabold">{f.label}</span>
                <input
                  data-field="where"
                  name="where"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setValues((v) => ({ ...v, where: undefined }));
                    setOpen("where");
                  }}
                  onFocus={() => setOpen("where")}
                  placeholder={f.empty}
                  autoComplete="off"
                  role="combobox"
                  aria-autocomplete="list"
                  aria-expanded={isOpen}
                  aria-controls={`${id}-where`}
                  className="w-full truncate bg-transparent text-[0.9375rem] text-ink placeholder:text-ink-soft focus:outline-none"
                />
              </label>
            ) : (
              <button
                type="button"
                data-field={f.key}
                aria-expanded={isOpen}
                aria-controls={`${id}-${f.key}`}
                onClick={() => setOpen(isOpen ? null : f.key)}
                className={`block min-w-0 flex-1 rounded-full py-3.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ink ${
                  last ? "pr-3 pl-7" : "pr-10 pl-7"
                }`}
              >
                <span className="block text-[0.75rem] font-extrabold">{f.label}</span>
                <span className={`block truncate text-[0.9375rem] ${shown ? "text-ink" : "text-ink-soft"}`}>{shown ?? f.empty}</span>
              </button>
            )}

            {values[f.key] && isOpen && !last && (
              <ClearButton label={f.label} onClick={() => set(f.key, undefined)} className="absolute top-1/2 right-3 -translate-y-1/2" />
            )}
            {values[f.key] && isOpen && last && <ClearButton label={f.label} onClick={() => set(f.key, undefined)} className="mr-2" />}

            {last && <SearchButton expanded={active} />}
          </div>
        );
      })}

      {open && (
        <div
          id={`${id}-${open}`}
          role="dialog"
          aria-label={fields[openIndex].label}
          style={{ order: openIndex * 2 + 1 }}
          className={[
            "z-40 mx-2 mb-2 rounded-[28px] bg-white p-3 shadow-[0_16px_40px_-12px_rgba(22,35,58,0.35)] ring-1 ring-ink/5 md:absolute md:top-[calc(100%+12px)] md:m-0 md:rounded-[32px] md:p-4",
            open === "month" ? "md:inset-x-0" : openIndex === 0 ? "md:left-0 md:w-[440px]" : "md:right-0 md:w-[420px]",
          ].join(" ")}
        >
          {open === "where" && (
            <WherePanel
              countries={countries.filter((c) => c.country.toLowerCase().includes(query.trim().toLowerCase()))}
              total={mode === "programs" ? new Set(tiles.map((t) => t.programSlug)).size : venues.length}
              noun={mode === "programs" ? "trip" : "place"}
              sport={sport}
              selected={values.where}
              onChoose={(v) => choose("where", v)}
            />
          )}
          {open === "month" && <MonthPanel months={months} selected={values.month} onChoose={(v) => choose("month", v)} />}
          {open === "level" && (
            <OptionsPanel
              title="Playing level"
              options={LEVELS}
              anyLabel="Any level"
              counts={countFor("level", LEVELS)}
              selected={values.level}
              onChoose={(v) => choose("level", v)}
            />
          )}
          {open === "format" && (
            <OptionsPanel
              title="Format"
              options={FORMATS}
              anyLabel="Any format"
              counts={countFor("format", FORMATS)}
              selected={values.format}
              onChoose={(v) => choose("format", v)}
            />
          )}
          {open === "courts" && (
            <OptionsPanel
              title="Court surface"
              options={SURFACE_OPTIONS}
              anyLabel="Any surface"
              selected={values.courts}
              onChoose={(v) => choose("courts", v)}
            />
          )}
          {open === "guests" && <GuestsPanel value={Number(values.guests ?? 0)} onChange={(n) => set("guests", n ? String(n) : undefined)} />}
        </div>
      )}
    </form>
  );
}

function ClearButton({ label, onClick, className }: { label: string; onClick: () => void; className: string }) {
  return (
    <button
      type="button"
      aria-label={`Clear ${label.toLowerCase()}`}
      onClick={onClick}
      className={`grid size-6 shrink-0 place-items-center rounded-full bg-rule hover:bg-ink/15 ${className}`}
    >
      <svg viewBox="0 0 12 12" className="size-2.5" aria-hidden="true">
        <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </button>
  );
}

function SearchButton({ expanded }: { expanded: boolean }) {
  return (
    <button
      type="submit"
      aria-label="Search"
      className={`mr-2 flex h-12 shrink-0 items-center justify-center gap-2 overflow-hidden rounded-full bg-ball font-extrabold text-ink transition-[width] duration-200 hover:brightness-95 ${
        expanded ? "w-[7.25rem]" : "w-12"
      }`}
    >
      <svg viewBox="0 0 20 20" className="size-[18px] shrink-0" aria-hidden="true">
        <circle cx="8.5" cy="8.5" r="6" fill="none" stroke="currentColor" strokeWidth="2.4" />
        <path d="m13 13 5 5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
      {expanded && <span className="text-[0.9375rem]">Search</span>}
    </button>
  );
}

function PanelTitle({ children }: { children: React.ReactNode }) {
  return <p className="px-3 pt-2 pb-3 text-[0.8125rem] font-extrabold">{children}</p>;
}

type RowProps = { selected: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode };

function Row({ selected, disabled, onClick, children }: RowProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      className="flex w-full items-center gap-4 rounded-2xl px-3 py-2.5 text-left hover:bg-mist focus:outline-none focus-visible:ring-2 focus-visible:ring-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent aria-pressed:bg-mist"
    >
      {children}
    </button>
  );
}

// Tiny court in the sport's colours: the row icon for each country.
function CourtTile({ sport }: { sport: Sport }) {
  return (
    <span className="grid size-12 shrink-0 place-items-center rounded-xl" style={{ backgroundColor: SURFACES[sport].surround }} aria-hidden="true">
      <span className="relative block h-5 w-8 border-[1.5px] border-white" style={{ backgroundColor: SURFACES[sport].court }}>
        <span className="absolute inset-y-[-3px] left-1/2 w-[1.5px] -translate-x-1/2 bg-white" />
      </span>
    </span>
  );
}

type CountryRow = { country: string; count: number; places: string[] };

function WherePanel(props: {
  countries: CountryRow[];
  total: number;
  noun: string;
  sport: Sport;
  selected?: string;
  onChoose: (v?: string) => void;
}) {
  const { countries, total, noun, sport, selected, onChoose } = props;
  return (
    <div className="max-h-[420px] overflow-y-auto">
      <PanelTitle>Where to play</PanelTitle>
      <Row selected={!selected} onClick={() => onChoose(undefined)}>
        <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-mist" aria-hidden="true">
          <svg viewBox="0 0 24 24" className="size-6 text-ink" fill="none" stroke="currentColor" strokeWidth="1.6">
            <circle cx="12" cy="12" r="9" />
            <path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z" />
          </svg>
        </span>
        <span>
          <span className="block font-semibold">Anywhere</span>
          <span className="block text-[0.875rem] text-ink-soft">
            All {plural(total, noun)} for {SPORT_NAMES[sport].toLowerCase()}
          </span>
        </span>
      </Row>
      {countries.map((c) => (
        <Row key={c.country} selected={selected === c.country} onClick={() => onChoose(c.country)}>
          <CourtTile sport={sport} />
          <span className="min-w-0">
            <span className="block font-semibold">{c.country}</span>
            <span className="block truncate text-[0.875rem] text-ink-soft">
              {plural(c.count, noun)}
              {c.places.length > 0 && ` in ${c.places.join(" and ")}`}
            </span>
          </span>
        </Row>
      ))}
      {countries.length === 0 && <p className="px-3 py-4 text-ink-soft">No {noun}s there yet. Try another country.</p>}
    </div>
  );
}

function MonthPanel(props: { months: { month: string; count: number }[]; selected?: string; onChoose: (v?: string) => void }) {
  const { months, selected, onChoose } = props;
  return (
    <div className="px-1 py-2 md:px-4">
      <p className="text-center text-[1.0625rem] font-semibold">When do you want to go?</p>
      <ul className="mt-5 flex snap-x gap-3 overflow-x-auto pr-10 pb-2 [mask-image:linear-gradient(to_right,black_calc(100%-48px),transparent)]">
        <li className="snap-start">
          <MonthCard selected={!selected} onClick={() => onChoose(undefined)} title="Any time" sub="All dates" />
        </li>
        {months.map((m) => (
          <li key={m.month} className="snap-start">
            <MonthCard
              selected={selected === m.month}
              disabled={m.count === 0 && selected !== m.month}
              onClick={() => onChoose(m.month)}
              title={monthName(m.month)}
              sub={m.count ? `${m.month.slice(0, 4)}, ${plural(m.count, "trip")}` : `${m.month.slice(0, 4)}, no matches`}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

type MonthCardProps = { selected: boolean; disabled?: boolean; onClick: () => void; title: string; sub: string };

function MonthCard({ selected, disabled, onClick, title, sub }: MonthCardProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      className="flex h-[124px] w-[128px] flex-col items-center justify-center gap-1 rounded-2xl border border-rule text-center hover:border-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-rule aria-pressed:border-ink aria-pressed:bg-mist aria-pressed:shadow-[inset_0_0_0_1px_var(--color-ink)]"
    >
      <svg viewBox="0 0 24 24" className="mb-1 size-7 text-ink-soft" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
        <path d="M3.5 10h17M8 3v4M16 3v4" />
      </svg>
      <span className="font-semibold">{title}</span>
      <span className="text-[0.8125rem] text-ink-soft">{sub}</span>
    </button>
  );
}

type OptionsPanelProps = {
  title: string;
  options: Option[];
  anyLabel: string;
  // trips per option ("" = any); options with none are dimmed
  counts?: Record<string, number>;
  selected?: string;
  onChoose: (v?: string) => void;
};

function OptionsPanel({ title, options, anyLabel, counts, selected, onChoose }: OptionsPanelProps) {
  const count = (v: string) =>
    counts && <span className="ml-auto shrink-0 pl-3 text-[0.875rem] text-ink-soft tabular-nums">{plural(counts[v] ?? 0, "trip")}</span>;
  return (
    <div>
      <PanelTitle>{title}</PanelTitle>
      <Row selected={!selected} onClick={() => onChoose(undefined)}>
        <Radio on={!selected} />
        <span className="font-semibold">{anyLabel}</span>
        {count("")}
      </Row>
      {options.map((o) => (
        <Row
          key={o.value}
          selected={selected === o.value}
          disabled={counts?.[o.value] === 0 && selected !== o.value}
          onClick={() => onChoose(o.value)}
        >
          <Radio on={selected === o.value} />
          <span>
            <span className="block font-semibold">{o.label}</span>
            {o.hint && <span className="block text-[0.875rem] text-ink-soft">{o.hint}</span>}
          </span>
          {count(o.value)}
        </Row>
      ))}
    </div>
  );
}

function Radio({ on }: { on: boolean }) {
  return (
    <span aria-hidden="true" className={`grid size-5 shrink-0 place-items-center rounded-full border-2 ${on ? "border-ink" : "border-ink-soft/50"}`}>
      {on && <span className="size-2.5 rounded-full bg-ink" />}
    </span>
  );
}

function GuestsPanel({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const step = (by: number) => onChange(Math.min(16, Math.max(0, value + by)));
  return (
    <div className="flex items-center justify-between px-3 py-3">
      <span>
        <span className="block font-semibold">Guests</span>
        <span className="block text-[0.875rem] text-ink-soft">Players and non-players</span>
      </span>
      <span className="flex items-center gap-3">
        <Stepper label="Remove a guest" disabled={value === 0} onClick={() => step(-1)} sign="−" />
        <span className="w-6 text-center tabular-nums" aria-live="polite">
          {value}
        </span>
        <Stepper label="Add a guest" disabled={value >= 16} onClick={() => step(1)} sign="+" />
      </span>
    </div>
  );
}

function Stepper({ label, sign, disabled, onClick }: { label: string; sign: string; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-8 place-items-center rounded-full border border-ink-soft/40 text-[1.125rem] leading-none hover:border-ink disabled:cursor-not-allowed disabled:opacity-30"
    >
      {sign}
    </button>
  );
}
