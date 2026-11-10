"use client";

import { useActionState, useState, useTransition, type FormEvent } from "react";
import { saveProgram, type SaveResult } from "@/app/admin/(panel)/actions";
import { CategoryIcon, LevelIcon } from "@/components/icons";
import { Choices, ErrorText, Field, INPUT, invalid, SelectField, TextField } from "@/components/submit/fields";
import { PhotoManager, PHOTOS_INTRO } from "@/components/admin/PhotoManager";
import type { ListingState } from "@/lib/admin/queries";
import { COUNTRIES } from "@/lib/countries";
import {
  ACCOMMODATION_OPTIONS,
  CATEGORY_OPTIONS,
  CURRENCY_OPTIONS,
  LEVEL_OPTIONS,
  PRICE_UNIT_OPTIONS,
  RATIO_OPTIONS,
  SPORT_OPTIONS,
  SURFACE_OPTIONS,
} from "@/lib/submission-options";
import { BTN_DARK, BTN_OUTLINE, BTN_PRIMARY } from "@/lib/ui";

type Session = { startDate: string; endDate: string; status: "available" | "waitlist" | "sold_out"; priceOverride: number | null; bookingUrl: string | null };

export type EditableProgram = {
  id: string;
  slug: string;
  state: ListingState;
  title: string;
  organizer: string;
  soldThroughId: string | null;
  description: string | null;
  bookingUrl: string;
  sourceUrl: string | null;
  coaches: string[];
  sports: string[];
  category: string;
  level: string[];
  country: string;
  cityRegion: string | null;
  venueName: string | null;
  venueId: string | null;
  lat: number | null;
  lng: number | null;
  scheduleNotes: string | null;
  priceMin: number | null;
  priceMax: number | null;
  currency: string | null;
  priceUnit: string | null;
  priceNotes: string | null;
  inclusions: string[];
  courtSurfaces: string[];
  coachingHoursTotal: number | null;
  playerToCoachRatio: string | null;
  capacity: number | null;
  accommodationType: string | null;
  featuredRank: number | null;
  sessions: Session[];
  photos: { id: number; url: string }[];
};

const SESSION_STATUS_OPTIONS = [
  ["available", "Available"],
  ["waitlist", "Waitlist"],
  ["sold_out", "Sold out"],
] as const;

const CATEGORY_ICONS = Object.fromEntries(CATEGORY_OPTIONS.map(([v]) => [v, <CategoryIcon key={v} category={v} className="size-6" />]));
const LEVEL_ICONS = Object.fromEntries(LEVEL_OPTIONS.map(([v]) => [v, <LevelIcon key={v} level={[v]} className="size-6" />]));

let nextRow = 0;

export function ProgramEditor({
  program: p,
  venues,
  organizations,
}: {
  program: EditableProgram;
  venues: { id: string; name: string; country: string }[];
  organizations: { id: string; name: string; kind: string }[];
}) {
  const [result, dispatch] = useActionState<SaveResult, FormData>(saveProgram.bind(null, p.id), null);
  const [pending, startTransition] = useTransition();
  const [rows, setRows] = useState(() => p.sessions.map((s) => ({ key: nextRow++, s })));
  const errors = result?.errors ?? {};
  const sessionError = (part: string, i: number) => errors[`session_${part}.${i}`];

  // submitted by hand rather than through `action`, so a failed save doesn't reset what was typed
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget, (event.nativeEvent as SubmitEvent).submitter);
    startTransition(() => dispatch(form));
  }

  return (
    <form onSubmit={submit} className="grid gap-6" aria-busy={pending}>
      {result && (
        <p role="status" className={`rounded-2xl px-5 py-3 text-[0.9375rem] font-semibold ${result.ok ? "bg-[#e3f3e8] text-[#1d6b3c]" : "border-2 border-alert bg-white text-alert"}`}>
          {result.message}
        </p>
      )}

      <Card title="Basics">
        <div className="grid gap-6 sm:grid-cols-2">
          <TextField name="title" label="Program name" defaultValue={p.title} error={errors.title} />
          <TextField
            name="organizer"
            label="Operator"
            list="operator-names"
            hint="Who runs it. A name we know links to that operator; a new one adds an operator."
            defaultValue={p.organizer}
            error={errors.organizer}
          />
          <datalist id="operator-names">
            {organizations
              .filter((o) => o.kind === "operator")
              .map((o) => (
                <option key={o.id} value={o.name} />
              ))}
          </datalist>
          <SelectField
            name="sold_through_id"
            label="Sold through"
            optional
            placeholder="The operator (usual)"
            hint="Only when it can't be booked with the operator directly."
            options={organizations.filter((o) => o.kind === "marketplace").map((o) => [o.id, o.name] as const)}
            defaultValue={p.soldThroughId}
            error={errors.sold_through_id}
          />
        </div>
        <Field name="description" label="Description" optional error={errors.description}>
          <textarea id="description" name="description" rows={5} defaultValue={p.description ?? ""} className={INPUT} {...invalid("description", errors.description)} />
        </Field>
        <div className="grid gap-6 sm:grid-cols-2">
          <TextField name="booking_url" label="Booking page" type="url" defaultValue={p.bookingUrl} error={errors.booking_url} />
          <TextField name="source_url" label="Source page" optional type="url" hint="Where the details were read from; harvests recheck it." defaultValue={p.sourceUrl} error={errors.source_url} />
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <TextField
            name="slug"
            label="Address"
            hint={p.state === "live" ? "Live listings keep their address." : `courttrips.com/programs/${p.slug}`}
            defaultValue={p.slug}
            error={errors.slug}
          />
          <TextField name="coaches" label="Coaches" optional hint="Names, separated by commas." defaultValue={p.coaches.join(", ")} error={errors.coaches} />
        </div>
      </Card>

      <Card title="Kind of program">
        <Choices name="racket_sport" legend="Sport" options={SPORT_OPTIONS} checked={p.sports} error={errors.racket_sport} />
        <Choices name="category" legend="Kind" type="radio" options={CATEGORY_OPTIONS} icons={CATEGORY_ICONS} checked={[p.category]} error={errors.category} />
        <Choices name="level" legend="Level" options={LEVEL_OPTIONS} icons={LEVEL_ICONS} columns="grid-cols-2 sm:grid-cols-4" checked={p.level} error={errors.level} />
      </Card>

      <Card title="Where">
        <div className="grid gap-6 sm:grid-cols-2">
          <SelectField name="country" label="Country" options={COUNTRIES} defaultValue={p.country} error={errors.country} />
          <TextField name="city_region" label="Town or region" optional defaultValue={p.cityRegion} error={errors.city_region} />
          <TextField name="venue_name" label="Venue name" optional defaultValue={p.venueName} error={errors.venue_name} />
          <SelectField
            name="venue_id"
            label="Linked venue"
            optional
            placeholder="None"
            options={venues.map((v) => [v.id, `${v.name} (${v.country})`] as const)}
            defaultValue={p.venueId}
            error={errors.venue_id}
          />
          <TextField name="lat" label="Latitude" optional type="number" step="any" hint="For the map view." defaultValue={p.lat} error={errors.lat} />
          <TextField name="lng" label="Longitude" optional type="number" step="any" defaultValue={p.lng} error={errors.lng} />
        </div>
      </Card>

      <Card title="Dates" intro="Every date, past ones included; past dates don't show on the site.">
        <div className="grid gap-3">
          {rows.map(({ key, s }, i) => (
            <div key={key} className="grid grid-cols-2 items-start gap-3 rounded-2xl border border-rule p-3 sm:grid-cols-[1fr_1fr_1fr_1fr_auto]">
              <Field name={`session_start-${i}`} label="Starts" error={sessionError("start", i)}>
                <input id={`session_start-${i}`} name="session_start" type="date" defaultValue={s?.startDate} className={INPUT} {...invalid(`session_start-${i}`, sessionError("start", i))} />
              </Field>
              <Field name={`session_end-${i}`} label="Ends" error={sessionError("end", i)}>
                <input id={`session_end-${i}`} name="session_end" type="date" defaultValue={s?.endDate} className={INPUT} {...invalid(`session_end-${i}`, sessionError("end", i))} />
              </Field>
              <Field name={`session_status-${i}`} label="Availability">
                <div className="relative">
                  <select id={`session_status-${i}`} name="session_status" defaultValue={s?.status ?? "available"} className={`${INPUT} appearance-none pr-11`}>
                    {SESSION_STATUS_OPTIONS.map(([v, label]) => (
                      <option key={v} value={v}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <svg viewBox="0 0 16 16" className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-ink-soft" aria-hidden="true">
                    <path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </Field>
              <Field name={`session_price-${i}`} label="Price" optional error={sessionError("price", i)}>
                <input id={`session_price-${i}`} name="session_price" type="number" min={0} step="any" defaultValue={s?.priceOverride ?? ""} className={INPUT} />
              </Field>
              <button
                type="button"
                onClick={() => setRows(rows.filter((r) => r.key !== key))}
                className="self-end rounded-full px-3 py-2.5 text-[0.9375rem] font-semibold text-ink-soft transition-colors hover:bg-mist hover:text-ink"
                aria-label={`Remove date ${i + 1}`}
              >
                Remove
              </button>
              <Field name={`session_url-${i}`} label="Booking link for these dates" optional error={sessionError("booking_url", i)} className="col-span-2 sm:col-span-5">
                <input id={`session_url-${i}`} name="session_url" type="text" inputMode="url" defaultValue={s?.bookingUrl ?? ""} className={INPUT} />
              </Field>
            </div>
          ))}
        </div>
        <div>
          <button type="button" onClick={() => setRows([...rows, { key: nextRow++, s: null as unknown as Session }])} className={`px-4 py-2 text-[0.9375rem] ${BTN_OUTLINE}`}>
            Add a date
          </button>
          <ErrorText name="sessions" error={errors.sessions} />
        </div>
        <TextField name="schedule_notes" label="Schedule notes" optional defaultValue={p.scheduleNotes} error={errors.schedule_notes} />
      </Card>

      <Card title="Price">
        <div className="grid gap-6 sm:grid-cols-4">
          <TextField name="price_min" label="From" optional type="number" step="any" defaultValue={p.priceMin} error={errors.price_min} />
          <TextField name="price_max" label="Up to" optional type="number" step="any" defaultValue={p.priceMax} error={errors.price_max} />
          <SelectField name="currency" label="Currency" optional options={CURRENCY_OPTIONS} defaultValue={p.currency} error={errors.currency} />
          <SelectField name="price_unit" label="Per" optional options={PRICE_UNIT_OPTIONS} defaultValue={p.priceUnit} error={errors.price_unit} />
        </div>
        <TextField name="price_notes" label="Price notes" optional defaultValue={p.priceNotes} error={errors.price_notes} />
        <Field name="inclusions" label="What's included" optional hint="One per line." error={errors.inclusions}>
          <textarea id="inclusions" name="inclusions" rows={4} defaultValue={p.inclusions.join("\n")} className={INPUT} />
        </Field>
      </Card>

      <Card title="On court">
        <Choices name="court_surface" legend="Court surface" optional options={SURFACE_OPTIONS} columns="grid-cols-2 sm:grid-cols-5" checked={p.courtSurfaces} error={errors.court_surface} />
        <div className="grid gap-6 sm:grid-cols-4">
          <TextField name="coaching_hours_total" label="Coaching hours" optional type="number" step="0.5" defaultValue={p.coachingHoursTotal} error={errors.coaching_hours_total} />
          <SelectField name="player_to_coach_ratio" label="Players per coach" optional options={RATIO_OPTIONS} defaultValue={p.playerToCoachRatio} error={errors.player_to_coach_ratio} />
          <TextField name="capacity" label="Places" optional type="number" step="1" defaultValue={p.capacity} error={errors.capacity} />
          <SelectField name="accommodation_type" label="Accommodation" optional options={ACCOMMODATION_OPTIONS} defaultValue={p.accommodationType} error={errors.accommodation_type} />
        </div>
        <TextField
          name="featured_rank"
          label="Homepage carousel position"
          optional
          type="number"
          step="1"
          hint="1 is first in its sport's carousel. Blank keeps it out."
          defaultValue={p.featuredRank}
          error={errors.featured_rank}
          className="max-w-[260px]"
        />
      </Card>

      <Card title="Photos" intro={PHOTOS_INTRO}>
        <PhotoManager owner="program" id={p.id} photos={p.photos} />
      </Card>

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-3 border-t border-rule bg-white/95 px-4 py-3 backdrop-blur sm:-mx-8 sm:px-8">
        <button type="submit" name="intent" value="save" disabled={pending} className={`px-5 py-2.5 ${BTN_DARK}`}>
          {pending ? "Saving…" : "Save"}
        </button>
        {p.state === "review" && (
          <button type="submit" name="intent" value="publish" disabled={pending} className={`px-5 py-2.5 ${BTN_PRIMARY}`}>
            Save and publish
          </button>
        )}
        {p.state === "live" && (
          <button type="submit" name="intent" value="unpublish" disabled={pending} className={`px-5 py-2.5 ${BTN_OUTLINE}`}>
            Unpublish
          </button>
        )}
        <span className="ml-auto" />
        {p.state === "archived" ? (
          <button type="submit" name="intent" value="restore" disabled={pending} className={`px-5 py-2.5 ${BTN_OUTLINE}`}>
            Restore to review
          </button>
        ) : (
          <button type="submit" name="intent" value="archive" disabled={pending} className="rounded-full px-4 py-2.5 font-semibold text-alert transition-colors hover:bg-alert/10">
            Archive
          </button>
        )}
      </div>
    </form>
  );
}

function Card({ title, intro, children }: { title: string; intro?: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-6 rounded-[20px] bg-white p-5 sm:p-7">
      <div>
        <h2 className="text-[1.125rem] font-extrabold">{title}</h2>
        {intro && <p className="mt-0.5 text-[0.9375rem] text-ink-soft">{intro}</p>}
      </div>
      {children}
    </section>
  );
}
