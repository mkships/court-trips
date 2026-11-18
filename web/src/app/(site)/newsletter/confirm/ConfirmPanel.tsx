"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { H1 } from "@/components/Browse";
import { SPORTS, SPORT_NAMES } from "@/lib/sports";
import { BTN_DARK, BTN_PRIMARY, CHOICE, LINK } from "@/lib/ui";
import { confirm, saveSports } from "../actions";

const LEAD = "mt-4 max-w-[52ch] text-[1.0625rem] leading-relaxed text-ink-soft";

// Confirm first (a button, not the email link, so mail scanners can't confirm for people), then
// say which sports. Opening the link again later goes straight to the sports.
export function ConfirmPanel(props: { token: string; confirmed: boolean; sports: string[] }) {
  const { token } = props;
  const [confirmed, setConfirmed] = useState(props.confirmed);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (task: () => Promise<void>) =>
    startTransition(async () => {
      setError(null);
      try {
        await task();
      } catch {
        setError("We couldn't reach the server. Check your connection and try again.");
      }
    });

  if (!confirmed)
    return (
      <>
        <h1 className={`mt-6 ${H1}`}>One click to confirm</h1>
        <p className={LEAD}>Confirm your email address and we&apos;ll start sending you new trips and dates, about once a month.</p>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            run(async () => {
              const { ok } = await confirm(token);
              if (ok) setConfirmed(true);
              else setError("That didn't work. The link may be out of date; sign up again to get a new one.");
            })
          }
          className={`mt-6 px-6 py-3 text-[1rem] ${BTN_PRIMARY}`}
        >
          {pending ? "Confirming…" : "Confirm my email"}
        </button>
        {error && (
          <p role="alert" className="mt-3 text-[0.9375rem] font-semibold text-alert">
            {error}
          </p>
        )}
      </>
    );

  return (
    <>
      <h1 className={`mt-6 ${H1}`}>You&apos;re on the list</h1>
      <p className={LEAD}>Which sports do you play? We&apos;ll only send you those. Leave them all unticked to hear about everything.</p>
      <form
        className="mt-6"
        onChange={() => setSaved(false)}
        onSubmit={(event) => {
          event.preventDefault();
          const sports = new FormData(event.currentTarget).getAll("sport").map(String);
          run(async () => {
            const { ok } = await saveSports(token, sports);
            if (ok) setSaved(true);
            else setError("That didn't save. Please try again.");
          });
        }}
      >
        <fieldset>
          <legend className="sr-only">Sports</legend>
          <div className="flex flex-wrap gap-2">
            {SPORTS.map((sport) => (
              <label key={sport} className={`${CHOICE} items-center font-semibold`}>
                <input type="checkbox" name="sport" value={sport} defaultChecked={props.sports.includes(sport)} className="size-4 accent-ink" />
                {SPORT_NAMES[sport]}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="mt-5 flex flex-wrap items-center gap-4">
          <button type="submit" disabled={pending} className={`px-6 py-3 text-[1rem] ${BTN_DARK}`}>
            {pending ? "Saving…" : "Save"}
          </button>
          {saved && (
            <p role="status" className="text-[0.9375rem] font-semibold text-ok-ink">
              Saved.{" "}
              <Link href="/trips" className={`text-ink ${LINK}`}>
                Browse trips
              </Link>
            </p>
          )}
        </div>
        {error && (
          <p role="alert" className="mt-3 text-[0.9375rem] font-semibold text-alert">
            {error}
          </p>
        )}
      </form>
    </>
  );
}
