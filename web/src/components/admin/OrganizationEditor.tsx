"use client";

import { useActionState, useTransition, type FormEvent } from "react";
import type { SaveResult } from "@/app/admin/(panel)/actions";
import { Choices, Field, INPUT, invalid, SelectField, TextField } from "@/components/submit/fields";
import { COUNTRIES } from "@/lib/countries";
import { SPORT_OPTIONS } from "@/lib/submission-options";
import { BTN_DARK } from "@/lib/ui";

export type EditableOrganization = {
  id?: string;
  slug: string;
  name: string;
  kind: string;
  status: string;
  website: string | null;
  description: string | null;
  country: string | null;
  sports: string[];
  aliases: string[];
  note: string | null;
  sourceUrl: string | null;
  seenOnId: string | null;
};

const KINDS = [
  ["operator", "Operator: runs the programmes"],
  ["marketplace", "Marketplace or directory: lists other people's programmes"],
] as const;

const STATUSES = [
  ["active", "Active: listed, or ready to list"],
  ["lead", "Lead: known, not listed yet"],
  ["archived", "Archived: hidden"],
] as const;

export function OrganizationEditor({
  organization: o,
  action,
  marketplaces,
  submitLabel = "Save",
}: {
  organization: EditableOrganization;
  action: (prev: SaveResult, form: FormData) => Promise<SaveResult>;
  marketplaces: { id: string; name: string }[];
  submitLabel?: string;
}) {
  const [result, dispatch] = useActionState<SaveResult, FormData>(action, null);
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
        <p role="status" className={`rounded-2xl px-5 py-3 text-[0.9375rem] font-semibold ${result.ok ? "bg-[#e3f3e8] text-[#1d6b3c]" : "border-2 border-alert bg-white text-alert"}`}>
          {result.message}
        </p>
      )}
      <section className="grid gap-6 rounded-[20px] bg-white p-5 sm:p-7">
        <div className="grid gap-6 sm:grid-cols-2">
          <TextField name="name" label="Name" defaultValue={o.name} error={errors.name} />
          <TextField
            name="slug"
            label="Address"
            optional={!o.id}
            hint={o.id ? "Its page: /operators/address" : "Left empty, it's made from the name."}
            defaultValue={o.slug}
            error={errors.slug}
          />
          <SelectField name="kind" label="Kind" options={KINDS} defaultValue={o.kind} error={errors.kind} />
          <SelectField name="status" label="Status" options={STATUSES} defaultValue={o.status} error={errors.status} />
          <TextField name="website" label="Website" optional type="url" defaultValue={o.website} error={errors.website} />
          <SelectField name="country" label="Based in" optional placeholder="Not set" options={COUNTRIES} defaultValue={o.country} error={errors.country} />
        </div>
        <Field name="description" label="About" optional hint="Shown on their public page: one to three plain sentences." error={errors.description}>
          <textarea id="description" name="description" rows={3} defaultValue={o.description ?? ""} className={INPUT} {...invalid("description", errors.description)} />
        </Field>
        <Choices name="sports" legend="Sports" optional hint="For leads; listed operators take their sports from their listings." options={SPORT_OPTIONS} checked={o.sports} error={errors.sports} />
        <Field name="aliases" label="Other names" optional hint="Other spellings listings use, one per line. Imports that use them link here." error={errors.aliases}>
          <textarea id="aliases" name="aliases" rows={2} defaultValue={o.aliases.join("\n")} className={INPUT} {...invalid("aliases", errors.aliases)} />
        </Field>
      </section>
      <section className="grid gap-6 rounded-[20px] bg-white p-5 sm:p-7">
        <h2 className="text-[1.125rem] font-extrabold">For us</h2>
        <Field name="note" label="Note" optional hint="Not shown on the site: what to check, why it isn't listed yet." error={errors.note}>
          <textarea id="note" name="note" rows={3} defaultValue={o.note ?? ""} className={INPUT} {...invalid("note", errors.note)} />
        </Field>
        <div className="grid gap-6 sm:grid-cols-2">
          <TextField name="source_url" label="Where we found them" optional type="url" defaultValue={o.sourceUrl} error={errors.source_url} />
          <SelectField
            name="seen_on_id"
            label="Seen on"
            optional
            placeholder="Their own site"
            options={marketplaces.filter((m) => m.id !== o.id).map((m) => [m.id, m.name] as const)}
            defaultValue={o.seenOnId}
            error={errors.seen_on_id}
          />
        </div>
      </section>
      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-3 border-t border-rule bg-white/95 px-4 py-3 backdrop-blur sm:-mx-8 sm:px-8">
        <button type="submit" disabled={pending} className={`px-5 py-2.5 ${BTN_DARK}`}>
          {pending ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
