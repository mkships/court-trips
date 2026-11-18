"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { H1 } from "@/components/Browse";
import { BTN_DARK, LINK } from "@/lib/ui";
import { unsubscribe } from "../actions";

const LEAD = "mt-4 max-w-[52ch] text-[1.0625rem] leading-relaxed text-ink-soft";

// A button rather than unsubscribing on page load, so a mail scanner opening the link can't do it.
export function UnsubscribeButton({ token }: { token: string }) {
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (done)
    return (
      <>
        <h1 className={`mt-6 ${H1}`}>You&apos;re unsubscribed</h1>
        <p className={LEAD}>
          You won&apos;t get any more emails from us. Changed your mind?{" "}
          <Link href="/newsletter" className={`text-ink ${LINK}`}>
            Sign up again
          </Link>
          .
        </p>
      </>
    );

  return (
    <>
      <h1 className={`mt-6 ${H1}`}>Unsubscribe from Court Trips</h1>
      <p className={LEAD}>You&apos;ll stop getting our emails about new trips and dates.</p>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            try {
              const { ok } = await unsubscribe(token);
              if (ok) setDone(true);
              else setError("That didn't work. Reply to any of our emails and we'll take you off the list.");
            } catch {
              setError("We couldn't reach the server. Check your connection and try again.");
            }
          })
        }
        className={`mt-6 px-6 py-3 text-[1rem] ${BTN_DARK}`}
      >
        {pending ? "Unsubscribing…" : "Unsubscribe"}
      </button>
      {error && (
        <p role="alert" className="mt-3 text-[0.9375rem] font-semibold text-alert">
          {error}
        </p>
      )}
    </>
  );
}
