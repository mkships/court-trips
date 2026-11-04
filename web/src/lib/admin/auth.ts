import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { readSession, SESSION_COOKIE } from "@/lib/admin/session";

// For admin pages and server actions: the session, or off to the sign-in page. Middleware already
// guards /admin, but a server action can be called from anywhere, so each one checks too.
export async function requireAdmin() {
  const session = await readSession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) redirect("/admin/login");
  return session;
}

// What's missing for GitHub sign-in, so the sign-in page can say so instead of failing.
export function signInSetupMissing() {
  const missing = ["GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET", "ADMIN_GITHUB_LOGIN"].filter((n) => !process.env[n]?.trim());
  const secret = process.env.ADMIN_SESSION_SECRET?.trim() ?? "";
  if (secret.length < 32) missing.push("ADMIN_SESSION_SECRET (32+ characters)");
  return missing;
}
