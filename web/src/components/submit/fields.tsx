import type { ReactNode } from "react";

// Small building blocks for the "List your program" form. Each input is named after the field the
// server validates (src/lib/submission.ts), and shows that field's error under it.

export const INPUT =
  "block w-full rounded-xl border border-rule bg-white px-3.5 py-2.5 text-[1rem] placeholder:text-ink-soft/60 hover:border-ink/40 aria-invalid:border-alert";

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
      {hint && <p className="mt-0.5 text-[0.875rem] text-ink-soft">{hint}</p>}
      <div className="mt-1.5">{children}</div>
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
  className?: string;
}) {
  const { name, label, hint, optional, error, type = "text", className, ...rest } = props;
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
}) {
  const { name, label, options, hint, optional, error, placeholder = "Choose…", className } = props;
  return (
    <Field name={name} label={label} hint={hint} optional={optional} error={error} className={className}>
      <select id={name} name={name} required={!optional} defaultValue="" className={INPUT} {...invalid(name, error)}>
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
}) {
  const { name, legend, options, type = "checkbox", hint, optional, error, columns = "sm:grid-cols-3" } = props;
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
              className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-rule px-3.5 py-2.5 hover:border-ink/40 has-checked:border-ink has-checked:bg-mist"
            >
              <input
                type={type}
                name={name}
                value={value}
                id={i === 0 ? name : undefined}
                required={type === "radio" && !optional}
                className="mt-1 size-4 shrink-0 accent-ink"
              />
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
