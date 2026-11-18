import { asc, eq } from "drizzle-orm";
import { subscribers } from "@/db/schema";
import { requireAdmin } from "@/lib/admin/auth";
import { adminDb } from "@/lib/admin/queries";
import { unsubscribeUrl } from "@/lib/newsletter";

export const dynamic = "force-dynamic";

// Confirmed subscribers only, for importing into whatever sends the newsletter. Each row carries
// its own unsubscribe link, which every email must include.
const cell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

export async function GET() {
  await requireAdmin();
  const rows = await adminDb()
    .select({ email: subscribers.email, sports: subscribers.sports, confirmedAt: subscribers.confirmedAt, token: subscribers.token })
    .from(subscribers)
    .where(eq(subscribers.status, "confirmed"))
    .orderBy(asc(subscribers.confirmedAt));
  const lines = [
    "email,sports,confirmed_at,unsubscribe_url",
    ...rows.map((r) =>
      [r.email, r.sports.join(" ") || "all", r.confirmedAt?.toISOString() ?? "", unsubscribeUrl(r.token)].map(cell).join(","),
    ),
  ];
  return new Response(lines.join("\n") + "\n", {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="court-trips-subscribers-${new Date().toISOString().slice(0, 10)}.csv"`,
      "cache-control": "no-store",
    },
  });
}
