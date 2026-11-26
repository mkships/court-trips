import type { Metadata } from "next";
import { H1 } from "@/components/Browse";
import { Illustration } from "@/components/Illustration";
import { NewsletterForm } from "@/components/NewsletterForm";
import { NEWSLETTER_TURNSTILE_ACTION, turnstileSiteKey } from "@/lib/turnstile";

export const metadata: Metadata = {
  title: "New trips by email | Court Trips",
  description:
    "New tennis, pickleball and padel camps, clinics and getaways, and fresh dates for the ones you know, in one email about once a month.",
  alternates: { canonical: "/newsletter" },
};

const POINTS = [
  ["New trips", "Camps, clinics and getaways we've just added, with their dates and prices."],
  ["New dates", "When an operator opens next season's weeks, before they fill up."],
  ["Only your sports", "Tell us whether you play tennis, pickleball or padel and that's all you'll get."],
];

export default function NewsletterPage() {
  return (
    <main className="mx-auto max-w-[1040px] px-4 sm:px-8">
      {/* the sign-up comes first on a phone; the illustration follows it */}
      <div className="mt-4 grid items-center gap-8 rounded-3xl bg-warm px-6 py-8 sm:px-10 sm:py-10 md:grid-cols-[minmax(0,1fr)_auto] md:gap-12">
        <div>
          <h1 className={`max-w-[18ch] ${H1}`}>New racket trips, once a month</h1>
          <p className="mt-4 max-w-[52ch] text-[1.0625rem] leading-relaxed text-ink-soft">
            One email, about once a month, with the trips and dates that are new on Court Trips. No offers from anyone
            else.
          </p>
          <NewsletterForm siteKey={turnstileSiteKey()} action={NEWSLETTER_TURNSTILE_ACTION} className="mt-6 max-w-[520px]" />
        </div>
        <Illustration eager className="mx-auto h-auto w-[240px] md:w-[300px] lg:w-[360px]" />
      </div>
      <ul className="mt-12 grid gap-6 sm:grid-cols-3">
        {POINTS.map(([title, text]) => (
          <li key={title} className="border-t-2 border-ink pt-4">
            <h2 className="text-[1.125rem] font-extrabold tracking-[-0.01em]">{title}</h2>
            <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-soft">{text}</p>
          </li>
        ))}
      </ul>
      <p className="mt-10 max-w-[64ch] text-[0.875rem] leading-relaxed text-ink-soft">
        We use your email address only to send this, and never share it. Every email has a link to unsubscribe in one
        click.
      </p>
    </main>
  );
}
