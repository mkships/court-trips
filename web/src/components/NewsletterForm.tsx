"use client";

import { usePathname } from "next/navigation";
import { useId, useRef, useState, useTransition, type FormEvent } from "react";
import { subscribe } from "@/app/(site)/newsletter/actions";
import { Turnstile } from "@/components/submit/Turnstile";
import { BTN_DARK, BTN_PRIMARY, INPUT } from "@/lib/ui";

// The email sign-up, on light pages and in the dark footer. The bot check only loads once someone
// touches the form, and stays invisible unless Cloudflare wants them to tick a box.
export function NewsletterForm(props: { siteKey: string; action: string; dark?: boolean; className?: string }) {
  const { siteKey, action, dark, className = "" } = props;
  const pathname = usePathname();
  const id = useId();
  const form = useRef<HTMLFormElement>(null);
  const [armed, setArmed] = useState(false);
  const verified = useRef(false);
  // submitted before the bot check was ready: send as soon as it is
  const queued = useRef(false);
  const [waiting, setWaiting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  function onToken(ok: boolean) {
    verified.current = ok;
    if (!queued.current) return;
    queued.current = false;
    setWaiting(false);
    if (ok) form.current?.requestSubmit();
    else setMessage("The bot check didn't load. Reload the page and try again.");
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    if (!verified.current) {
      setArmed(true);
      queued.current = true;
      setWaiting(true);
      return;
    }
    const data = new FormData(event.currentTarget);
    startTransition(async () => {
      let result;
      try {
        result = await subscribe(data);
      } catch {
        result = { ok: false as const, message: "We couldn't reach the server. Check your connection and try again." };
      }
      if (result.ok) setSent(true);
      else {
        setMessage(result.message);
        // tokens work once; unmounting and remounting the widget gets a fresh one
        verified.current = false;
        setArmed(false);
      }
    });
  }

  if (sent)
    return (
      <p role="status" className={`text-[0.9375rem] leading-relaxed ${dark ? "text-white" : ""} ${className}`}>
        <strong className="font-extrabold">Check your inbox.</strong> We&apos;ve sent you a link to confirm your email
        address.
      </p>
    );

  const busy = pending || waiting;
  return (
    <form ref={form} onSubmit={submit} onFocus={() => setArmed(true)} className={className} noValidate>
      <label htmlFor={`${id}-email`} className="sr-only">
        Email address
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id={`${id}-email`}
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          aria-invalid={message ? true : undefined}
          aria-describedby={message ? `${id}-message` : undefined}
          className={`${INPUT} min-w-0 flex-1`}
        />
        <button type="submit" disabled={busy} className={`shrink-0 px-5 py-2.5 text-[1rem] ${dark ? BTN_PRIMARY : BTN_DARK}`}>
          {busy ? "Signing up…" : "Sign up"}
        </button>
      </div>
      <input type="hidden" name="source" value={pathname} />
      {/* people never see this; bots fill it in */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
      {armed && (
        <div className="mt-2">
          <Turnstile siteKey={siteKey} action={action} onToken={onToken} compact />
        </div>
      )}
      {message && (
        <p id={`${id}-message`} role="alert" className={`mt-2 text-[0.875rem] font-semibold ${dark ? "text-ball" : "text-alert"}`}>
          {message}
        </p>
      )}
    </form>
  );
}
