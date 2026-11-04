import { NextResponse, type NextRequest } from "next/server";
import { cookieOptions, STATE_COOKIE, siteUrl } from "@/lib/admin/session";

// Step 1 of GitHub sign-in: send the visitor to GitHub with a one-time `state`, kept in a cookie
// so the callback can tell the answer is to a request we made.
export async function GET(request: NextRequest) {
  const clientId = process.env.GITHUB_CLIENT_ID?.trim();
  if (!clientId) return NextResponse.redirect(siteUrl(request, "/admin/login?error=setup"));

  const state = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("base64url");
  const authorize = new URL("https://github.com/login/oauth/authorize");
  authorize.searchParams.set("client_id", clientId);
  authorize.searchParams.set("redirect_uri", siteUrl(request, "/admin/auth/callback").toString());
  authorize.searchParams.set("state", state);
  authorize.searchParams.set("allow_signup", "false");
  // no scope: only the public profile, which is all we need to read the login

  const response = NextResponse.redirect(authorize);
  response.cookies.set(STATE_COOKIE, state, cookieOptions(600));
  return response;
}
