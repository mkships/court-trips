import { NextResponse, type NextRequest } from "next/server";
import { adminLogin, cookieOptions, SESSION_COOKIE, sessionSecret, signSession, STATE_COOKIE, siteUrl } from "@/lib/admin/session";

// Step 2 of GitHub sign-in: GitHub sends the visitor back with a code. Swap it for a token, ask
// GitHub whose account it is, and sign in only the one allowed account.
export async function GET(request: NextRequest) {
  const fail = (error: string) => {
    const response = NextResponse.redirect(siteUrl(request, `/admin/login?error=${error}`));
    response.cookies.delete({ name: STATE_COOKIE, path: "/admin" });
    return response;
  };

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const expected = request.cookies.get(STATE_COOKIE)?.value;
  if (!code || !state || !expected || state !== expected) return fail("expired");

  const clientId = process.env.GITHUB_CLIENT_ID?.trim();
  const clientSecret = process.env.GITHUB_CLIENT_SECRET?.trim();
  const allowed = adminLogin();
  const secret = sessionSecret();
  if (!clientId || !clientSecret || !allowed || !secret) return fail("setup");

  try {
    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: siteUrl(request, "/admin/auth/callback").toString(),
      }),
    });
    const { access_token: token } = (await tokenResponse.json()) as { access_token?: string };
    if (!token) return fail("github");

    const userResponse = await fetch("https://api.github.com/user", {
      headers: { authorization: `Bearer ${token}`, accept: "application/vnd.github+json", "user-agent": "court-trips-admin" },
    });
    const user = (await userResponse.json()) as { login?: string };
    if (user.login?.toLowerCase() !== allowed) {
      console.warn(`[admin] sign-in refused for GitHub account ${user.login ?? "(unknown)"}`);
      return fail("denied");
    }

    const session = await signSession(user.login, secret);
    const response = NextResponse.redirect(siteUrl(request, "/admin"));
    response.cookies.set(SESSION_COOKIE, session.value, cookieOptions(session.maxAge));
    response.cookies.delete({ name: STATE_COOKIE, path: "/admin" });
    return response;
  } catch (error) {
    console.error("[admin] GitHub sign-in failed:", error);
    return fail("github");
  }
}
