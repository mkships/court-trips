"use client";

import Link from "next/link";
import { useRef, useState, useTransition, type FormEvent } from "react";
import { submitProgram } from "@/app/list-your-program/actions";
import { CategoryIcon, LevelIcon } from "@/components/icons";
import { Choices, ErrorText, Field, INPUT, invalid, Section, SelectField, TextField } from "@/components/submit/fields";
import { PhotoPicker, type PickedPhoto } from "@/components/submit/PhotoPicker";
import { Turnstile, type TurnstileHandle } from "@/components/submit/Turnstile";
import { COUNTRIES } from "@/lib/countries";
import {
  ACCOMMODATION_OPTIONS,
  CATEGORY_OPTIONS,
  CURRENCY_OPTIONS,
  GENDER_OPTIONS,
  INCLUSION_OPTIONS,
  LANGUAGE_OPTIONS,
  LEVEL_OPTIONS,
  MAX_SESSIONS,
  PRICE_UNIT_OPTIONS,
  RATIO_OPTIONS,
  SPORT_OPTIONS,
  SURFACE_OPTIONS,
  THEME_OPTIONS,
} from "@/lib/submission-options";
import type { FieldErrors } from "@/lib/submission";
import { BTN_DARK, BTN_OUTLINE } from "@/lib/ui";

const CATEGORY_ICONS = Object.fromEntries(CATEGORY_OPTIONS.map(([v]) => [v, <CategoryIcon key={v} category={v} className="size-6" />]));
const LEVEL_ICONS = Object.fromEntries(LEVEL_OPTIONS.map(([v]) => [v, <LevelIcon key={v} level={[v]} className="size-6" />]));

let nextRow = 0;
const newRow = () => nextRow++;

export function ListingForm({ siteKey, turnstileAction }: { siteKey: string; turnstileAction: string }) {
  const [rows, setRows] = useState<number[]>(() => [newRow()]);
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();
  const turnstile = useRef<TurnstileHandle>(null);
  const summary = useRef<HTMLDivElement>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    photos.forEach((p, i) => form.append("photos", p.blob, `${i}.jpg`));
    startTransition(async () => {
      let result;
      try {
        result = await submitProgram(form);
      } catch {
        result = { ok: false as const, message: "We couldn't reach the server. Check your connection and send it again." };
      }
      if (result.ok) {
        setSent(true);
        window.scrollTo({ top: 0 });
        return;
      }
      setErrors(result.errors ?? {});
      setMessage(result.message);
      // tokens work once, so every failed attempt needs a fresh check
      turnstile.current?.reset();
      requestAnimationFrame(() => summary.current?.focus());
    });
  }

  if (sent) {
    return (
      <div className="mt-8 rounded-[28px] bg-mist p-6 sm:p-10" role="status">
        <p className="text-[1.5rem] font-extrabold tracking-[-0.02em]">Thanks, we&apos;ve got it.</p>
        <p className="mt-2 max-w-[55ch] text-ink-soft">
          We&apos;ll check it against your website and publish it, usually within a few days. If anything&apos;s unclear,
          we&apos;ll email you.
        </p>
        <Link href="/" className={`mt-6 px-5 py-2.5 ${BTN_DARK}`}>
          Back to Court Trips
        </Link>
      </div>
    );
  }

  const errorList = Object.entries(errors).filter(([, e]) => e);
  const sessionError = (part: "start" | "end" | "price", i: number) => errors[`session_${part}.${i}`];

  return (
    <form onSubmit={submit} className="mt-8 grid gap-10" aria-busy={pending}>
      {message && (
        <div ref={summary} tabIndex={-1} role="alert" className="rounded-2xl border-2 border-alert p-5">
          <p className="font-extrabold">{message}</p>
          {errorList.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-[0.9375rem]">
              {errorList.map(([field, error]) => (
                <li key={field}>
                  <a href={`#${field === "sessions" ? "session_start-0" : field.replace(".", "-")}`} className="underline underline-offset-2">
                    {error}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* bots fill in every field; people never see this one */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <Section title="The program" intro="Players see this first.">
        <TextField name="title" label="Program name" placeholder="e.g. Clay-court tennis week in Mallorca" maxLength={120} error={errors.title} />
        <TextField name="organizer" label="Run by" hint="Your club, academy, coach or travel company." maxLength={120} error={errors.organizer} />
        <Field name="description" label="Description" hint="What a day looks like, who it's for, what makes it good. A few sentences." error={errors.description}>
          <textarea id="description" name="description" required minLength={40} maxLength={3000} rows={6} className={INPUT} {...invalid("description", errors.description)} />
        </Field>
        <Choices name="racket_sport" legend="Sport" options={SPORT_OPTIONS} error={errors.racket_sport} />
        <Choices name="category" legend="Kind of program" type="radio" options={CATEGORY_OPTIONS} icons={CATEGORY_ICONS} error={errors.category} />
        <Choices name="level" legend="Who it's for" options={LEVEL_OPTIONS} icons={LEVEL_ICONS} columns="grid-cols-2 sm:grid-cols-4" error={errors.level} />
        <Choices name="theme" legend="Good for" optional options={THEME_OPTIONS} error={errors.theme} />
        <div className="grid gap-6 sm:grid-cols-2">
          <SelectField name="gender" label="Open to" optional options={GENDER_OPTIONS} placeholder="Everyone" error={errors.gender} />
          <TextField name="coaches" label="Coaches" optional hint="Names, separated by commas." error={errors.coaches} />
        </div>
        <Choices name="languages" legend="Coaching language" optional options={LANGUAGE_OPTIONS} error={errors.languages} />
      </Section>

      <Section title="Where">
        <div className="grid gap-6 sm:grid-cols-2">
          <SelectField name="country" label="Country" options={COUNTRIES} error={errors.country} />
          <TextField name="city_region" label="Town or region" optional placeholder="e.g. Mallorca" error={errors.city_region} />
        </div>
        <TextField name="venue_name" label="Venue" optional hint="The club, resort or academy where it takes place." error={errors.venue_name} />
      </Section>

      <Section title="Dates" intro="Add each date players can book. Runs all season, or on request? Say so in the schedule notes.">
        <div>
          <ul className="grid gap-3">
            {rows.map((row, i) => (
              <li key={row} className="grid grid-cols-2 items-start gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
                <Field name={`session_start-${i}`} label="Starts" error={sessionError("start", i)}>
                  <input id={`session_start-${i}`} name="session_start" type="date" className={INPUT} {...invalid(`session_start-${i}`, sessionError("start", i))} />
                </Field>
                <Field name={`session_end-${i}`} label="Ends" error={sessionError("end", i)}>
                  <input id={`session_end-${i}`} name="session_end" type="date" className={INPUT} {...invalid(`session_end-${i}`, sessionError("end", i))} />
                </Field>
                <Field name={`session_price-${i}`} label="Price" optional error={sessionError("price", i)}>
                  <input id={`session_price-${i}`} name="session_price" type="number" min={0} step="any" inputMode="decimal" className={INPUT} {...invalid(`session_price-${i}`, sessionError("price", i))} />
                </Field>
                <button
                  type="button"
                  onClick={() => setRows(rows.filter((r) => r !== row))}
                  disabled={rows.length === 1}
                  className="self-end rounded-full px-3 py-2.5 text-[0.9375rem] font-semibold text-ink-soft transition-colors hover:bg-mist hover:text-ink disabled:invisible"
                  aria-label={`Remove date ${i + 1}`}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
          {rows.length < MAX_SESSIONS && (
            <button
              type="button"
              onClick={() => setRows([...rows, newRow()])}
              className={`mt-3 px-4 py-2 text-[0.9375rem] ${BTN_OUTLINE}`}
            >
              Add another date
            </button>
          )}
          <ErrorText name="sessions" error={errors.sessions} />
        </div>
        <TextField name="schedule_notes" label="Schedule notes" optional placeholder="e.g. Weekly, Sunday to Sunday, May to September" maxLength={300} error={errors.schedule_notes} />
      </Section>

      <Section title="Price" intro="For the whole program. One price? Fill in From only. Quote on request? Leave it blank.">
        <div className="grid gap-6 sm:grid-cols-3">
          <TextField name="price_min" label="From" optional type="number" min={0} step="any" error={errors.price_min} />
          <TextField name="price_max" label="Up to" optional type="number" min={0} step="any" error={errors.price_max} />
          <SelectField name="currency" label="Currency" optional options={CURRENCY_OPTIONS} error={errors.currency} />
        </div>
        <SelectField name="price_unit" label="The price is" optional options={PRICE_UNIT_OPTIONS} error={errors.price_unit} />
        <TextField name="price_notes" label="Price notes" optional placeholder="e.g. Single room supplement €200; early-bird 10% off" maxLength={300} error={errors.price_notes} />
        <Choices name="inclusions" legend="Included" optional options={INCLUSION_OPTIONS} columns="grid-cols-2 sm:grid-cols-4" error={errors.inclusions} />
        <TextField name="other_inclusions" label="Also included" optional hint="Anything else, separated by commas." error={errors.other_inclusions} />
      </Section>

      <Section title="On court" intro="Optional, but players filter and compare on these.">
        <Choices name="court_surface" legend="Court surface" optional options={SURFACE_OPTIONS} columns="grid-cols-2 sm:grid-cols-5" error={errors.court_surface} />
        <div className="grid gap-6 sm:grid-cols-3">
          <TextField name="coaching_hours_total" label="Coaching hours in total" optional type="number" min={0} step="0.5" error={errors.coaching_hours_total} />
          <SelectField name="player_to_coach_ratio" label="Players per coach" optional options={RATIO_OPTIONS} error={errors.player_to_coach_ratio} />
          <TextField name="capacity" label="Places per session" optional type="number" min={1} step="1" error={errors.capacity} />
        </div>
        <SelectField name="accommodation_type" label="Accommodation" optional options={ACCOMMODATION_OPTIONS} error={errors.accommodation_type} />
        <details className="group rounded-2xl border border-rule p-5">
          <summary className="font-semibold transition-colors hover:text-ink-soft">Player ratings (optional)</summary>
          <p className="mt-1 text-[0.875rem] text-ink-soft">If the program asks for a rating range: DUPR for pickleball, UTR or NTRP for tennis.</p>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {(
              [
                ["dupr", "DUPR", 2, 8, "0.25"],
                ["utr", "UTR", 1, 16.5, "0.5"],
                ["ntrp", "NTRP", 1, 7, "0.5"],
              ] as const
            ).map(([key, name, min, max, step]) => (
              <div key={key} className="contents sm:block sm:space-y-4">
                <TextField name={`${key}_min`} label={`${name} from`} optional type="number" min={min} max={max} step={step} error={errors[`${key}_min`]} />
                <TextField name={`${key}_max`} label={`${name} up to`} optional type="number" min={min} max={max} step={step} error={errors[`${key}_max`]} />
              </div>
            ))}
          </div>
        </details>
      </Section>

      <Section title="Photos and booking">
        <PhotoPicker photos={photos} onChange={setPhotos} error={errors.photos} />
        <TextField name="booking_url" label="Booking page" type="url" hint="Where players book or find out more. We link straight to it." placeholder="https://" error={errors.booking_url} />
        <div className="grid gap-6 sm:grid-cols-2">
          <TextField name="contact_email" label="Email for players" optional type="email" error={errors.contact_email} />
          <TextField name="contact_phone" label="Phone for players" optional type="tel" error={errors.contact_phone} />
        </div>
      </Section>

      <Section title="About you" intro="So we can check the listing with you. Never published.">
        <div className="grid gap-6 sm:grid-cols-2">
          <TextField name="submitter_name" label="Your name" autoComplete="name" error={errors.submitter_name} />
          <TextField name="submitter_email" label="Your email" type="email" autoComplete="email" error={errors.submitter_email} />
        </div>
        <div>
          <label className="flex items-start gap-3">
            <input id="consent" type="checkbox" name="consent" value="yes" required className="mt-1 size-4 shrink-0 accent-ink" {...invalid("consent", errors.consent)} />
            <span className="text-[0.9375rem]">
              I run this program or work for the people who do, and I&apos;m allowed to share these details and photos on
              Court Trips.
            </span>
          </label>
          <ErrorText name="consent" error={errors.consent} />
        </div>
      </Section>

      <div className="grid gap-4 border-t border-rule pt-8">
        <Turnstile ref={turnstile} siteKey={siteKey} action={turnstileAction} onToken={setVerified} />
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="submit"
            disabled={pending || !verified}
            className={`px-6 py-3 text-[1rem] ${BTN_DARK}`}
          >
            {pending ? "Sending…" : "Send for review"}
          </button>
          {!verified && !pending && <p className="text-[0.875rem] text-ink-soft">Finish the check above to send.</p>}
        </div>
      </div>
    </form>
  );
}
