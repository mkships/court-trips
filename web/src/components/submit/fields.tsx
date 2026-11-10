import type { ReactNode } from "react";

// Small building blocks for the "List your program" form. Each input is named after the field the
// server validates (src/lib/submission.ts), and shows that field's error under it. Hints sit under
// the input too, so fields side by side line up whether or not they have one.

export const INPUT =
  "block w-full rounded-xl border border-rule bg-white px-3.5 py-2.5 text-[1rem] transition-colors placeholder:text-ink-soft/60 hover:border-ink/50 aria-invalid:border-alert";

export const errorId = (name: string) => `${name}-error`;

export function ErrorText({ name, error }: { name: string; error?: string }) {
  if (!error) return null;
  return (
    <p id={errorId(name)} className="mt-1.5 text-[0.875rem] font-semibold text-alert">
      {error}
    </p>
  );
}

// aria props that tie an input to its error message
export const invalid = (name: string, error?: string) =>
  error ? { "aria-invalid": true as const, "aria-describedby": errorId(name) } : {};

export function Field(props: {
  name: string;
  label: string;
  hint?: string;
  optional?: boolean;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  const { name, label, hint, optional, error, children, className } = props;
  return (
    <div className={className}>
      <label htmlFor={name} className="block text-[0.9375rem] font-semibold">
        {label}
        {optional && <span className="font-normal text-ink-soft"> (optional)</span>}
      </label>
      <div className="mt-1.5">{children}</div>
      {hint && <p className="mt-1.5 text-[0.875rem] text-ink-soft">{hint}</p>}
      <ErrorText name={name} error={error} />
    </div>
  );
}

export function TextField(props: {
  name: string;
  label: string;
  hint?: string;
  optional?: boolean;
  error?: string;
  type?: "text" | "email" | "url" | "tel" | "number";
  placeholder?: string;
  maxLength?: number;
  step?: string;
  min?: number;
  max?: number;
  autoComplete?: string;
  // id of a <datalist> of suggestions
  list?: string;
  className?: string;
  defaultValue?: string | number | null;
}) {
  const { name, label, hint, optional, error, type = "text", className, defaultValue, ...rest } = props;
  return (
    <Field name={name} label={label} hint={hint} optional={optional} error={error} className={className}>
      <input
        id={name}
        name={name}
        // URLs are text inputs with the URL keyboard: browsers reject "example.com/book" without
        // https://, which the server adds itself
        type={type === "url" ? "text" : type}
        inputMode={type === "number" ? "decimal" : type === "url" ? "url" : undefined}
        autoCapitalize={type === "url" || type === "email" ? "none" : undefined}
        spellCheck={type === "url" || type === "email" ? false : undefined}
        required={!optional}
        className={INPUT}
        defaultValue={defaultValue ?? undefined}
        {...invalid(name, error)}
        {...rest}
      />
    </Field>
  );
}

export function SelectField(props: {
  name: string;
  label: string;
  options: readonly (readonly [string, string] | string)[];
  hint?: string;
  optional?: boolean;
  error?: string;
  placeholder?: string;
  className?: string;
  defaultValue?: string | null;
}) {
  const { name, label, options, hint, optional, error, placeholder = "Choose…", className, defaultValue } = props;
  return (
    <Field name={name} label={label} hint={hint} optional={optional} error={error} className={className}>
      {/* the browser's own arrow sits hard against the edge; this one has room to breathe */}
      <div className="relative">
        <select id={name} name={name} required={!optional} defaultValue={defaultValue ?? ""} className={`${INPUT} appearance-none pr-11`} {...invalid(name, error)}>
          <option value="">{placeholder}</option>
          {options.map((o) => {
            const [value, text] = typeof o === "string" ? [o, o] : o;
            return (
              <option key={value} value={value}>
                {text}
              </option>
            );
          })}
        </select>
        <svg viewBox="0 0 16 16" className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-ink-soft" aria-hidden="true">
          <path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </Field>
  );
}

// Checkbox or radio group. Required checkbox groups are checked on the server, since browsers
// can't require "at least one" of several checkboxes.
export function Choices(props: {
  name: string;
  legend: string;
  options: readonly (readonly [string, string, string?] | string)[];
  type?: "checkbox" | "radio";
  hint?: string;
  optional?: boolean;
  error?: string;
  columns?: string;
  // an icon per option value, shown before its label
  icons?: Partial<Record<string, ReactNode>>;
  // values ticked to begin with (editing an existing listing)
  checked?: readonly string[];
}) {
  const { name, legend, options, type = "checkbox", hint, optional, error, columns = "sm:grid-cols-3", icons, checked } = props;
  return (
    <fieldset {...invalid(name, error)}>
      <legend className="text-[0.9375rem] font-semibold">
        {legend}
        {optional && <span className="font-normal text-ink-soft"> (optional)</span>}
      </legend>
      {hint && <p className="mt-0.5 text-[0.875rem] text-ink-soft">{hint}</p>}
      <div className={`mt-2 grid gap-2 ${columns}`}>
        {options.map((o, i) => {
          const [value, text, detail] = typeof o === "string" ? [o, o[0].toUpperCase() + o.slice(1)] : o;
          return (
            <label
              key={value}
              className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-rule px-3.5 py-2.5 transition-colors hover:border-ink/50 hover:bg-mist/60 has-checked:border-ink has-checked:bg-mist has-checked:shadow-[inset_0_0_0_1px_var(--color-ink)]"
            >
              <input
                type={type}
                name={name}
                value={value}
                id={i === 0 ? name : undefined}
                defaultChecked={checked?.includes(value)}
                required={type === "radio" && !optional}
                className="mt-1 size-4 shrink-0 accent-ink"
              />
              {icons?.[value] && <span className="-my-0.5">{icons[value]}</span>}
              <span>
                <span className="block text-[0.9375rem] font-semibold">{text}</span>
                {detail && <span className="block text-[0.8125rem] text-ink-soft">{detail}</span>}
              </span>
            </label>
          );
        })}
      </div>
      <ErrorText name={name} error={error} />
    </fieldset>
  );
}

export function Section({ title, intro, children }: { title: string; intro?: string; children: ReactNode }) {
  return (
    <section className="border-t border-rule pt-8">
      <h2 className="text-[1.375rem] font-extrabold tracking-[-0.02em]">{title}</h2>
      {intro && <p className="mt-1 max-w-[60ch] text-ink-soft">{intro}</p>}
      <div className="mt-6 grid gap-6">{children}</div>
    </section>
  );
}
