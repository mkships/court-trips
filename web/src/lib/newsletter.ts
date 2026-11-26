import "server-only";
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { subscribers } from "@/db/schema";
import { siteUrl } from "@/lib/site";

// The "new trips and dates" email list. Sign-ups are stored in the subscribers table
// (src/db/schema.ts); this file holds the pieces the actions and pages share.

// how long before the same address can be sent another confirmation email
export const RESEND_CONFIRM_AFTER_MS = 10 * 60 * 1000;

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

// 32 random bytes, URL-safe: the key to one subscriber's confirm, settings and unsubscribe links
export const newToken = () => randomBytes(32).toString("base64url");
export const isToken = (t: unknown): t is string => typeof t === "string" && /^[A-Za-z0-9_-]{43}$/.test(t);

export const confirmUrl = (token: string) => new URL(`/newsletter/confirm?token=${token}`, siteUrl()).toString();
export const unsubscribeUrl = (token: string) => new URL(`/newsletter/unsubscribe?token=${token}`, siteUrl()).toString();

// Sends the "confirm your sign-up" email through Resend (same key as src/lib/notify.ts).
// RESEND_FROM must be on a domain verified in Resend: the onboarding@resend.dev fallback can only
// send to the Resend account's own address, so real visitors wouldn't get the email.
// Without RESEND_API_KEY (local, previews) the link is logged instead, so the flow can be tested.
export async function sendConfirmEmail(email: string, token: string) {
  const link = confirmUrl(token);
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) {
    console.info(`[newsletter] no RESEND_API_KEY, not emailed. Confirm link for ${email}: ${link}`);
    return;
  }
  const text = [
    "Thanks for signing up to Court Trips.",
    "",
    "Confirm your email address and we'll send you new tennis, pickleball and padel trips and dates, about once a month:",
    link,
    "",
    "If you didn't sign up, ignore this email and you won't hear from us again.",
  ].join("\n");
  // the logo is a PNG on the site (email clients don't draw SVG); the alt text covers blocked images
  const logo = new URL("/brand/logo-email.png", siteUrl()).toString();
  const html = `<p><img src="${logo}" width="200" height="48" alt="Court Trips" style="display:block;border:0"></p>
<p>Thanks for signing up to Court Trips.</p>
<p>Confirm your email address and we'll send you new tennis, pickleball and padel trips and dates, about once a month.</p>
<p><a href="${link}" style="display:inline-block;padding:12px 22px;border-radius:999px;background:#16233a;color:#ffffff;font-weight:600;text-decoration:none">Confirm my email</a></p>
<p style="color:#55627a">If you didn't sign up, ignore this email and you won't hear from us again.</p>`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: process.env.RESEND_FROM?.trim() || "Court Trips <onboarding@resend.dev>",
      to: [email],
      subject: "Confirm your Court Trips sign-up",
      text,
      html,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

// What a confirm or unsubscribe page needs to know about the link it was opened with.
export async function subscriberByToken(token: string | undefined) {
  if (!isToken(token) || !db) return null;
  const [row] = await db
    .select({ status: subscribers.status, sports: subscribers.sports })
    .from(subscribers)
    .where(eq(subscribers.token, token));
  return row ?? null;
}
