import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { getProgram } from "@/lib/seed";

// Outbound hand-off to the operator. Every "Book" button points here so we can
// count leads per program and date before redirecting.
// Clicks go to a local JSONL file for now; swap for real analytics before launch.
const LOG = path.join(process.cwd(), ".data", "clicks.jsonl");

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const program = getProgram(slug);
  if (!program) return new NextResponse("Program not found", { status: 404 });

  const date = request.nextUrl.searchParams.get("date");
  const session = program.sessions.find((s) => s.start === date);
  const target = new URL(session?.bookingUrl ?? program.bookingUrl);
  target.searchParams.set("utm_source", "courttrips");
  target.searchParams.set("utm_medium", "referral");

  try {
    await mkdir(path.dirname(LOG), { recursive: true });
    await appendFile(
      LOG,
      JSON.stringify({
        at: new Date().toISOString(),
        program: slug,
        date: session?.start ?? null,
        organizer: program.organizer,
        target: target.toString(),
        referrer: request.headers.get("referer"),
      }) + "\n",
    );
  } catch {
    // A failed log must never block the visitor's hand-off.
  }

  return NextResponse.redirect(target, 302);
}
