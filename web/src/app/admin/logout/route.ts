import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, siteUrl } from "@/lib/admin/session";

export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(siteUrl(request, "/admin/login"), 303);
  response.cookies.delete({ name: SESSION_COOKIE, path: "/admin" });
  return response;
}
