"use client";

import { useActionState, useTransition, type FormEvent } from "react";
import { saveVenue, type SaveResult } from "@/app/admin/(panel)/actions";
import { Choices, Field, INPUT, invalid, SelectField, TextField } from "@/components/submit/fields";
import { PhotoManager, PHOTOS_INTRO } from "@/components/admin/PhotoManager";
import type { ListingState } from "@/lib/admin/queries";
import { COUNTRIES } from "@/lib/countries";
import { SPORT_OPTIONS } from "@/lib/submission-options";
import { BTN_DARK, BTN_OUTLINE, BTN_PRIMARY } from "@/lib/ui";

export type EditableVenue = {
  id: string;
  slug: string;
  state: ListingState;
  name: string;
  kind: string;
  stars: number | null;
  adultsOnly: boolean;
  description: string | null;
  website: string | null;
  country: string;
  cityRegion: string | null;
  lat: number | null;
  lng: number | null;
  sports: string[];
  priceNotes: string | null;
  photos: { id: number; url: string }[];
};

const KINDS = [
  ["resort", "Resort"],
  ["hotel", "Hotel"],
  ["club", "Club"],
  ["academy", "Academy"],
] as const;

export function VenueEditor({ venue: v }: { venue: EditableVenue }) {
  const [result, dispatch] = useActionState<SaveResult, FormData>(saveVenue.bind(null, v.id), null);
  const [pending, startTransition] = useTransition();
  const errors = result?.errors ?? {};

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget, (event.nativeEvent as SubmitEvent).submitter);
    startTransition(() => dispatch(form));
  }

  return (
    <form onSubmit={submit} className="grid gap-6" aria-busy={pending}>
      {result && (
        <p role="status" className={`rounded-2xl px-5 py-3 text-[0.9375rem] font-semibold ${result.ok ? "bg-ok-soft text-ok-ink" : "border-2 border-alert bg-white text-alert"}`}>
          {result.message}
        </p>
      )}
      <section className="grid gap-6 rounded-3xl bg-white p-5 sm:p-7">
        <div className="grid gap-6 sm:grid-cols-2">
          <TextField name="name" label="Name" defaultValue={v.name} error={errors.name} />
          <SelectField name="kind" label="Kind" options={KINDS} defaultValue={v.kind} error={errors.kind} />
          <TextField name="website" label="Website" optional type="url" defaultValue={v.website} error={errors.website} />
          <TextField name="slug" label="Address" hint={v.state === "live" ? "Live venues keep their address." : undefined} defaultValue={v.slug} error={errors.slug} />
          <SelectField name="country" label="Country" options={COUNTRIES} defaultValue={v.country} error={errors.country} />
          <TextField name="city_region" label="Town or region" optional defaultValue={v.cityRegion} error={errors.city_region} />
          <TextField name="lat" label="Latitude" optional type="number" step="any" hint="For the map view." defaultValue={v.lat} error={errors.lat} />
          <TextField name="lng" label="Longitude" optional type="number" step="any" defaultValue={v.lng} error={errors.lng} />
          <TextField name="stars" label="Stars" optional type="number" step="1" min={1} max={5} defaultValue={v.stars} error={errors.stars} />
          <label className="flex items-center gap-3 self-end pb-2.5 text-[0.9375rem]">
            <input type="checkbox" name="adults_only" value="yes" defaultChecked={v.adultsOnly} className="size-4 accent-ink" />
            Adults only
          </label>
        </div>
        <Choices name="sports" legend="Sports with courts" options={SPORT_OPTIONS} checked={v.sports} error={errors.sports} />
        <Field name="description" label="Description" optional error={errors.description}>
          <textarea id="description" name="description" rows={4} defaultValue={v.description ?? ""} className={INPUT} {...invalid("description", errors.description)} />
        </Field>
        <TextField name="price_notes" label="Price notes" optional defaultValue={v.priceNotes} error={errors.price_notes} />
      </section>
      <section className="grid gap-6 rounded-3xl bg-white p-5 sm:p-7">
        <div>
          <h2 className="text-[1.125rem] font-extrabold">Photos</h2>
          <p className="mt-0.5 text-[0.9375rem] text-ink-soft">{PHOTOS_INTRO}</p>
        </div>
        <PhotoManager owner="venue" id={v.id} photos={v.photos} />
      </section>
      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-3 border-t border-rule bg-white/95 px-4 py-3 backdrop-blur sm:-mx-8 sm:px-8">
        <button type="submit" name="intent" value="save" disabled={pending} className={`px-5 py-2.5 ${BTN_DARK}`}>
          {pending ? "Saving…" : "Save"}
        </button>
        {v.state === "review" && (
          <button type="submit" name="intent" value="publish" disabled={pending} className={`px-5 py-2.5 ${BTN_PRIMARY}`}>
            Save and publish
          </button>
        )}
        {v.state === "live" && (
          <button type="submit" name="intent" value="unpublish" disabled={pending} className={`px-5 py-2.5 ${BTN_OUTLINE}`}>
            Unpublish
          </button>
        )}
        <span className="ml-auto" />
        {v.state === "archived" ? (
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
