import "server-only";
import type { NextRequest } from "next/server";
import { db } from "@/db";
import { clicks } from "@/db/schema";

// Crawlers, link unfurlers, uptime monitors and scripts (including our own post-deploy check)
// follow links too; none of them is a lead.
const BOTS =
  /bot|crawl|spider|slurp|preview|fetch|monitor|scan|curl|wget|python|node|undici|axios|go-http|java\/|headless|lighthouse|courttrips-smoke/i;

// Browsers that speculatively load a link before it's clicked say so in these headers.
const isPrefetch = (request: NextRequest) =>
  /prefetch|prerender/i.test(`${request.headers.get("sec-purpose") ?? ""} ${request.headers.get("purpose") ?? ""}`);

export function isRealVisitor(request: NextRequest) {
  const ua = request.headers.get("user-agent");
  return request.method === "GET" && !!ua && !BOTS.test(ua) && !isPrefetch(request);
}

type Click = { program: string; sessionDate: string | null; organizer: string; target: string };

// Where the click came from: our own page's path (no query string), or the other site's host.
function source(request: NextRequest) {
  try {
    const ref = new URL(request.headers.get("referer") ?? "");
    return ref.host === request.nextUrl.host
      ? { fromPath: ref.pathname, referrerHost: null }
      : { fromPath: null, referrerHost: ref.host };
  } catch {
    return { fromPath: null, referrerHost: null };
  }
}

export async function recordClick(request: NextRequest, click: Click) {
  const row = { ...click, ...source(request), country: request.headers.get("x-vercel-ip-country") };
  if (!db) {
    // The Vercel build refuses to deploy without a database (scripts/migrate.mjs), so this is local only.
    console.info("[click] no DATABASE_URL, not saved:", row);
    return;
  }
  await db.insert(clicks).values(row);
}
