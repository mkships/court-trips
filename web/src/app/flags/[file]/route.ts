import * as flags from "country-flag-icons/string/3x2";
import { FLAG_CODES } from "@/lib/country-info";

// Country flags as files, at /flags/gr.svg. All 249 are written once at build time from the
// country-flag-icons package, so a page loads only the flags it shows and none of them weigh on
// the JavaScript bundle (together they are about 180 KB).
export const dynamic = "force-static";
export const dynamicParams = false;
export const generateStaticParams = () => FLAG_CODES.map((code) => ({ file: `${code.toLowerCase()}.svg` }));

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const code = (await params).file.replace(/\.svg$/, "").toUpperCase();
  const svg = (flags as Record<string, string>)[code];
  if (!svg) return new Response("Not found", { status: 404 });
  return new Response(svg, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=31536000, immutable" } });
}
