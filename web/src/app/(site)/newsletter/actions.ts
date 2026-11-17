"use server";

import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { subscribers } from "@/db/schema";
import { isToken, newToken, normalizeEmail, RESEND_CONFIRM_AFTER_MS, sendConfirmEmail } from "@/lib/newsletter";
import { SPORTS, type Sport } from "@/lib/sports";
import { NEWSLETTER_TURNSTILE_ACTION, verifyTurnstile } from "@/lib/turnstile";

export type SubscribeResult = { ok: true } | { ok: false; message: string };

const TRY_AGAIN = "Something went wrong on our side. Please try again in a minute.";

const signUp = z.object({
  email: z.email().max(254),
  // the page they were on: a path on this site, nothing else
  source: z
    .string()
    .max(200)
    .regex(/^\/[^/\\]/)
    .or(z.literal("/"))
    .optional()
    .catch(undefined),
});

// Every outcome but a bad address or a failed bot check looks the same to the visitor ("check your
// inbox"), so the form can't be used to find out who's on the list.
export async function subscribe(form: FormData): Promise<SubscribeResult> {
  // a field people can't see; whatever fills it in is a bot
  if (String(form.get("website") ?? "")) return { ok: true };

  const parsed = signUp.safeParse({ email: form.get("email"), source: form.get("source") || undefined });
  if (!parsed.success) return { ok: false, message: "That doesn't look like an email address." };

  if (!(await verifyTurnstile(form.get("cf-turnstile-response")?.toString() ?? null, NEWSLETTER_TURNSTILE_ACTION)))
    return { ok: false, message: "We couldn't confirm you're not a bot. Please try again." };

  if (!db) {
    console.error("[newsletter] no DATABASE_URL; run `npx neon checkout dev` to save sign-ups locally");
    return { ok: false, message: TRY_AGAIN };
  }

  const email = normalizeEmail(parsed.data.email);
  try {
    const [existing] = await db.select().from(subscribers).where(eq(subscribers.email, email));
    if (existing?.status === "confirmed") return { ok: true };

    const sentRecently =
      existing?.confirmSentAt && Date.now() - existing.confirmSentAt.getTime() < RESEND_CONFIRM_AFTER_MS;
    if (sentRecently) return { ok: true };

    const token = existing?.token ?? newToken();
    if (existing) {
      await db
        .update(subscribers)
        .set({ status: "pending", confirmSentAt: new Date(), unsubscribedAt: null })
        .where(eq(subscribers.id, existing.id));
    } else {
      const inserted = await db
        .insert(subscribers)
        .values({ email, token, source: parsed.data.source, confirmSentAt: new Date() })
        .onConflictDoNothing()
        .returning({ id: subscribers.id });
      // two submits at once: the other one made the row and sends the email
      if (!inserted.length) return { ok: true };
    }
    await sendConfirmEmail(email, token);
  } catch (error) {
    console.error("[newsletter] sign-up failed:", error);
    return { ok: false, message: TRY_AGAIN };
  }
  return { ok: true };
}

// The button on /newsletter/confirm. A button rather than the link itself, because mail scanners
// open links in emails and would confirm addresses nobody meant to sign up.
export async function confirm(token: string): Promise<{ ok: boolean }> {
  if (!isToken(token) || !db) return { ok: false };
  const updated = await db
    .update(subscribers)
    .set({ status: "confirmed", confirmedAt: new Date(), unsubscribedAt: null })
    .where(and(eq(subscribers.token, token), ne(subscribers.status, "confirmed")))
    .returning({ id: subscribers.id });
  if (updated.length) return { ok: true };
  // already confirmed (a second click) is fine too
  const [row] = await db.select({ status: subscribers.status }).from(subscribers).where(eq(subscribers.token, token));
  return { ok: row?.status === "confirmed" };
}

export async function saveSports(token: string, sports: string[]): Promise<{ ok: boolean }> {
  if (!isToken(token) || !db) return { ok: false };
  const chosen = SPORTS.filter((s): s is Sport => sports.includes(s));
  const updated = await db
    .update(subscribers)
    .set({ sports: chosen })
    .where(and(eq(subscribers.token, token), eq(subscribers.status, "confirmed")))
    .returning({ id: subscribers.id });
  return { ok: updated.length > 0 };
}

export async function unsubscribe(token: string): Promise<{ ok: boolean }> {
  if (!isToken(token) || !db) return { ok: false };
  const updated = await db
    .update(subscribers)
    .set({ status: "unsubscribed", unsubscribedAt: new Date() })
    .where(eq(subscribers.token, token))
    .returning({ id: subscribers.id });
  return { ok: updated.length > 0 };
}
