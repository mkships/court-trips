import "server-only";

// Cloudflare Turnstile keeps bots off "List your program". Production needs real keys (the build
// fails without them, see next.config.ts); everywhere else Cloudflare's test keys stand in, and
// those always pass, so local and preview forms work without a Cloudflare account.
// https://developers.cloudflare.com/turnstile/troubleshooting/testing/
const TEST_SITE_KEY = "1x00000000000000000000AA";
const TEST_SECRET = "1x0000000000000000000000000000000AA";

export const TURNSTILE_ACTION = "list-your-program";

export const turnstileSiteKey = () => process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || TEST_SITE_KEY;

export async function verifyTurnstile(token: string | null) {
  if (!token) return false;
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim() || TEST_SECRET;
  try {
    // no remoteip: we don't handle visitors' IP addresses
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: new URLSearchParams({ secret, response: token }),
      signal: AbortSignal.timeout(10_000),
    });
    const result = (await res.json()) as { success: boolean; action?: string; "error-codes"?: string[] };
    if (!result.success) console.warn("[turnstile] rejected:", result["error-codes"]);
    // test keys report no action; real ones must match the widget's
    return result.success && (secret === TEST_SECRET || result.action === TURNSTILE_ACTION);
  } catch (error) {
    console.error("[turnstile] couldn't verify:", error);
    return false;
  }
}
