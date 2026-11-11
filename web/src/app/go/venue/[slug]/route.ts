import { after, NextResponse, type NextRequest } from "next/server";
import { isRealVisitor, recordClick } from "@/lib/clicks";
import { getVenue } from "@/lib/db";

// Outbound hand-off to a venue's own website, counted like the trips' "Book" buttons (/go/[slug]).
// Clicks are filed under "venue:<slug>", with the venue's name where a trip has its organizer.
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const venue = await getVenue(slug);
  if (!venue?.website) return new NextResponse("Venue not found", { status: 404 });

  const target = new URL(venue.website);
  target.searchParams.set("utm_source", "courttrips");
  target.searchParams.set("utm_medium", "referral");

  if (isRealVisitor(request)) {
    after(() =>
      recordClick(request, { program: `venue:${slug}`, sessionDate: null, organizer: venue.name, target: target.toString() }).catch((error) =>
        console.error("[click] not saved:", error),
      ),
    );
  }

  return NextResponse.redirect(target, 302);
}
