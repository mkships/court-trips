// The admin session: a cookie holding who signed in and until when, signed with HMAC-SHA256 so it
// can't be forged or edited. Web Crypto only, so the same code runs in middleware (Edge) and in
// route handlers and server actions (Node).

export const SESSION_COOKIE = "ct_admin";
export const STATE_COOKIE = "ct_admin_state";
const SESSION_DAYS = 30;

export type AdminSession = { login: string; exp: number };

// Locally, without a secret, a fixed one keeps development sign-in working. Never in production.
const DEV_SECRET = "court-trips-local-development-only-secret";

export function sessionSecret(): string | null {
  const secret = process.env.ADMIN_SESSION_SECRET?.trim();
  if (secret && secret.length >= 32) return secret;
  return process.env.NODE_ENV === "development" ? DEV_SECRET : null;
}

// The one GitHub account allowed in, compared case-insensitively (GitHub logins are).
export const adminLogin = () => process.env.ADMIN_GITHUB_LOGIN?.trim().toLowerCase() || null;

const encoder = new TextEncoder();

function base64url(bytes: Uint8Array) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64url(s: string) {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

const key = (secret: string) =>
  crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);

export async function signSession(login: string, secret: string) {
  const session: AdminSession = { login: login.toLowerCase(), exp: Date.now() + SESSION_DAYS * 86_400_000 };
  const payload = base64url(encoder.encode(JSON.stringify(session)));
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", await key(secret), encoder.encode(payload)));
  return { value: `${payload}.${base64url(signature)}`, maxAge: SESSION_DAYS * 86_400 };
}

// The session if the cookie is genuine, unexpired and still names the allowed account.
export async function readSession(cookie: string | undefined): Promise<AdminSession | null> {
  const secret = sessionSecret();
  const allowed = adminLogin() ?? (process.env.NODE_ENV === "development" ? "dev" : null);
  if (!cookie || !secret || !allowed) return null;
  const [payload, signature] = cookie.split(".");
  if (!payload || !signature) return null;
  try {
    // verify, not compare: Web Crypto's check takes the same time whatever the signature
    const ok = await crypto.subtle.verify("HMAC", await key(secret), fromBase64url(signature), encoder.encode(payload));
    if (!ok) return null;
    const session = JSON.parse(new TextDecoder().decode(fromBase64url(payload))) as AdminSession;
    if (typeof session.exp !== "number" || session.exp < Date.now() || session.login !== allowed) return null;
    return session;
  } catch {
    return null;
  }
}

export const cookieOptions = (maxAge: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/admin",
  maxAge,
});

// An absolute URL on the host the visitor actually used. request.url can carry the server's bind
// address instead (0.0.0.0 in development), which would drop the cookie and break GitHub's callback.
export function siteUrl(request: Request, path: string) {
  const headers = request.headers;
  const host = headers.get("x-forwarded-host") ?? headers.get("host");
  const proto = headers.get("x-forwarded-proto") ?? new URL(request.url).protocol.replace(":", "");
  return new URL(path, host ? `${proto}://${host}` : request.url);
}
