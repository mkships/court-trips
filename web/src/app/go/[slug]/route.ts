import { after, NextResponse, type NextRequest } from "next/server";
import { isRealVisitor, recordClick } from "@/lib/clicks";
import { getProgram } from "@/lib/seed";

// Outbound hand-off to the operator. Every "Book" button points here so we can
// count leads per program and date before redirecting.
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const program = getProgram(slug);
  if (!program) return new NextResponse("Program not found", { status: 404 });

  const date = request.nextUrl.searchParams.get("date");
  const session = program.sessions.find((s) => s.start === date);
  const target = new URL(session?.bookingUrl ?? program.bookingUrl);
  target.searchParams.set("utm_source", "courttrips");
  target.searchParams.set("utm_medium", "referral");

  // The visitor is redirected first; the click is written once the response has gone.
  if (isRealVisitor(request)) {
    after(() =>
      recordClick(request, {
        program: slug,
        sessionDate: session?.start ?? null,
        organizer: program.organizer,
        target: target.toString(),
      }).catch((error) => console.error("[click] not saved:", error)),
    );
  }

  return NextResponse.redirect(target, 302);
}
