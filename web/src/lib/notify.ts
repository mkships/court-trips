import "server-only";
import type { RetreatData } from "@/lib/submission";

// Emails a new submission to whoever reviews them, through Resend's HTTP API.
//   RESEND_API_KEY       Resend → API Keys (sending access is enough)
//   SUBMISSIONS_NOTIFY_TO  where the email goes; several addresses can be comma-separated
//   RESEND_FROM          a sender on a domain verified in Resend. Until you verify one, the default
//                        onboarding@resend.dev can only send to the Resend account's own address.
// Production refuses to build without the first two (next.config.ts). Elsewhere a missing key
// means the email is logged instead of sent.

type NewSubmission = { id: string; submitterName: string; submitterEmail: string; data: RetreatData; photoCount: number };

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function summary(s: NewSubmission) {
  const d = s.data;
  const dates = d.sessions.length
    ? d.sessions.map((x) => `${x.start_date} to ${x.end_date}`).join(", ")
    : (d.schedule_notes ?? "no dates");
  const price =
    d.pricing.price_min != null
      ? `${d.pricing.currency} ${d.pricing.price_min}${d.pricing.price_max !== d.pricing.price_min ? `–${d.pricing.price_max}` : ""}`
      : "not given";
  return [
    ["Program", d.core_identity.title],
    ["Run by", d.core_identity.organizer],
    ["Sport", d.categorization.racket_sport.join(", ")],
    ["Kind", d.categorization.category.replace("_", " ")],
    ["Where", [d.location.city_region, d.location.country].filter(Boolean).join(", ")],
    ["Dates", dates],
    ["Price", price],
    ["Booking page", d.core_identity.booking_url],
    ["Photos", String(s.photoCount)],
    ["Sent by", `${s.submitterName} <${s.submitterEmail}>`],
    ["Submission", s.id],
  ] as const;
}

export async function notifyNewSubmission(s: NewSubmission) {
  const key = process.env.RESEND_API_KEY?.trim();
  const to = process.env.SUBMISSIONS_NOTIFY_TO?.split(",").map((a) => a.trim()).filter(Boolean) ?? [];
  const rows = summary(s);
  const subject = `New listing to review: ${s.data.core_identity.title}`;
  if (!key || to.length === 0) {
    console.info(`[submission] no RESEND_API_KEY or SUBMISSIONS_NOTIFY_TO, not emailed: ${subject}`, Object.fromEntries(rows));
    return;
  }
  const text = `${rows.map(([k, v]) => `${k}: ${v}`).join("\n")}\n\nIt's waiting in the submissions table as pending. Reply to this email to reach the sender.`;
  const html = `<p>A new listing is waiting for review.</p><table cellpadding="4">${rows
    .map(([k, v]) => `<tr><td><strong>${escape(k)}</strong></td><td>${escape(v)}</td></tr>`)
    .join("")}</table><p>It's in the submissions table as pending. Reply to this email to reach the sender.</p>`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: process.env.RESEND_FROM?.trim() || "Court Trips <onboarding@resend.dev>",
      to,
      reply_to: s.submitterEmail,
      subject,
      text,
      html,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}
