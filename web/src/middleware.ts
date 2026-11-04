import { NextResponse, type NextRequest } from "next/server";
import { readSession, SESSION_COOKIE, siteUrl } from "@/lib/admin/session";

// Everything under /admin needs a valid admin session, apart from the sign-in page and the routes
// that sign you in. Pages and server actions check again themselves (src/lib/admin/auth.ts).
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/admin/login" || pathname.startsWith("/admin/auth/")) return NextResponse.next();
  if (await readSession(request.cookies.get(SESSION_COOKIE)?.value)) return NextResponse.next();
  return NextResponse.redirect(siteUrl(request, "/admin/login"));
}

export const config = { matcher: ["/admin", "/admin/:path*"] };
