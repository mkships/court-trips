import { NextResponse, type NextRequest } from "next/server";
import { adminLogin, cookieOptions, SESSION_COOKIE, sessionSecret, signSession, siteUrl } from "@/lib/admin/session";

// Local development only: sign in without GitHub. Production answers 404.
export async function GET(request: NextRequest) {
  const secret = sessionSecret();
  if (process.env.NODE_ENV !== "development" || !secret) return new NextResponse("Not found", { status: 404 });
  const session = await signSession(adminLogin() ?? "dev", secret);
  const response = NextResponse.redirect(siteUrl(request, "/admin"));
  response.cookies.set(SESSION_COOKIE, session.value, cookieOptions(session.maxAge));
  return response;
}
