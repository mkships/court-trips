import Link from "next/link";
import { notFound } from "next/navigation";
import { createDraftFromSubmission, rejectSubmission } from "@/app/admin/(panel)/actions";
import { day } from "@/components/admin/bits";
import { INPUT } from "@/components/submit/fields";
import { submission as getSubmission } from "@/lib/admin/queries";
import { CATEGORY_NAMES, dateRange, levelLabel, money, PRICE_UNIT_NAMES, STAY_NAMES } from "@/lib/format";
import type { Level } from "@/lib/sports";
import { BTN_OUTLINE, BTN_PRIMARY } from "@/lib/ui";

// One operator submission, laid out for checking against their website before it becomes a draft.
export default async function SubmissionPage({ params }: { params: Promise<{ id: string }> }) {
  const s = await getSubmission((await params).id);
  if (!s) notFound();
  const r = s.data;
  const price =
    r.pricing.price_min != null && r.pricing.currency
      ? `${money(r.pricing.price_min, r.pricing.currency)}${r.pricing.price_max && r.pricing.price_max !== r.pricing.price_min ? ` to ${money(r.pricing.price_max, r.pricing.currency)}` : ""}${r.pricing.price_unit ? ` ${PRICE_UNIT_NAMES[r.pricing.price_unit]}` : ""}`
      : "On request";
  const ratings = Object.entries(r.rating_systems)
    .map(([k, v]) => `${k.replace("_", " ").toUpperCase()} ${v}`)
    .join(", ");
  const rows: [string, React.ReactNode][] = [
    ["Operator", r.core_identity.organizer],
    ["Kind", CATEGORY_NAMES[r.categorization.category]],
    ["Sport", r.categorization.racket_sport.join(", ")],
    ["Level", levelLabel(r.categorization.level as Level[])],
    ["Good for", r.categorization.theme.join(", ") || "—"],
    ["Where", [r.location.venue_name, r.location.city_region, r.location.country].filter(Boolean).join(", ")],
    ["Dates", r.sessions.length ? r.sessions.map((x) => dateRange({ start: x.start_date, end: x.end_date, scheduleNotes: null })).join(" · ") : "—"],
    ["Schedule notes", r.schedule_notes ?? "—"],
    ["Price", price],
    ["Price notes", r.pricing.price_notes ?? "—"],
    ["Included", r.pricing.inclusions.join(", ") || "—"],
    ["Courts", r.sport_specific.court_surface.join(", ") || "—"],
    ["Coaching", [r.sport_specific.coaching_hours_total && `${r.sport_specific.coaching_hours_total} hours`, r.sport_specific.player_to_coach_ratio && `${r.sport_specific.player_to_coach_ratio} players per coach`, r.sport_specific.capacity && `${r.sport_specific.capacity} places`].filter(Boolean).join(", ") || "—"],
    ["Stay", r.sport_specific.accommodation_type ? STAY_NAMES[r.sport_specific.accommodation_type] : "—"],
    ["Coaches", r.core_identity.coaches.join(", ") || "—"],
    ["Languages", r.core_identity.languages.join(", ") || "—"],
    ["Ratings", ratings || "—"],
    [
      "Booking page",
      <a key="b" href={r.core_identity.booking_url} target="_blank" rel="noopener noreferrer" className="break-all underline decoration-ink/35 decoration-[1.5px] underline-offset-4 transition-colors hover:decoration-ink">
        {r.core_identity.booking_url}
      </a>,
    ],
    ["Contact for players", [r.core_identity.contact_email, r.core_identity.contact_phone].filter(Boolean).join(" · ") || "—"],
  ];

  return (
    <div className="grid gap-6">
      <div>
        <Link href="/admin" className="text-[0.9375rem] font-semibold text-ink-soft transition-colors hover:text-ink">
          Review queue
        </Link>
        <h1 className="mt-2 text-[1.75rem] leading-tight font-black tracking-[-0.03em]">{r.core_identity.title}</h1>
        <p className="mt-1 text-[0.9375rem] text-ink-soft">
          Sent {day(s.createdAt)} by {s.submitterName},{" "}
          <a href={`mailto:${s.submitterEmail}`} className="font-semibold text-ink underline decoration-ink/35 decoration-[1.5px] underline-offset-4 transition-colors hover:decoration-ink">
            {s.submitterEmail}
          </a>
        </p>
      </div>

      {s.status !== "pending" && (
        <p className="rounded-2xl bg-white px-5 py-3 text-[0.9375rem]">
          {s.status === "approved" ? "Made into a draft" : "Rejected"} on {day(s.reviewedAt)}.
          {s.program && (
            <>
              {" "}
              <Link href={`/admin/programs/${s.program.slug}`} className="font-semibold underline underline-offset-4">
                Open the listing
              </Link>
            </>
          )}
          {s.reviewNote && <span className="mt-1 block text-ink-soft">Note: {s.reviewNote}</span>}
        </p>
      )}

      <section className="rounded-3xl bg-white p-5 sm:p-7">
        <p className="max-w-[70ch] whitespace-pre-line">{r.core_identity.description}</p>
        <dl className="mt-6 grid gap-x-8 gap-y-3 sm:grid-cols-[180px_1fr]">
          {rows.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-[0.9375rem] text-ink-soft">{label}</dt>
              <dd className="text-[0.9375rem]">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {s.photos.length > 0 && (
        <section className="rounded-3xl bg-white p-5 sm:p-7">
          <h2 className="text-[1.125rem] font-extrabold">Photos</h2>
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {s.photos.map((ph, i) => (
              <li key={ph.url}>
                <a href={ph.url} target="_blank" rel="noopener noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element -- admin thumbnails of uploads */}
                  <img src={ph.url} alt={`Photo ${i + 1}`} className="aspect-[4/3] w-full rounded-xl bg-rule object-cover" />
                </a>
                <span className="mt-1 block text-[0.8125rem] text-ink-soft">
                  {ph.width} × {ph.height}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {s.status === "pending" && (
        <section className="grid gap-4 rounded-3xl bg-white p-5 sm:grid-cols-2 sm:p-7">
          <form action={createDraftFromSubmission.bind(null, s.id)} className="grid content-start gap-2">
            <h2 className="text-[1.125rem] font-extrabold">Looks right</h2>
            <p className="text-[0.9375rem] text-ink-soft">Makes a draft listing you can edit. Nothing goes live until you publish it.</p>
            <button type="submit" className={`mt-2 justify-self-start px-5 py-2.5 ${BTN_PRIMARY}`}>
              Create draft listing
            </button>
          </form>
          <form action={rejectSubmission.bind(null, s.id)} className="grid content-start gap-2">
            <h2 className="text-[1.125rem] font-extrabold">Not for Court Trips</h2>
            <label htmlFor="note" className="text-[0.9375rem] text-ink-soft">
              Note for yourself (optional). The operator isn&apos;t emailed.
            </label>
            <textarea id="note" name="note" rows={2} className={INPUT} />
            <button type="submit" className={`mt-2 justify-self-start px-5 py-2.5 text-alert ${BTN_OUTLINE}`}>
              Reject
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
