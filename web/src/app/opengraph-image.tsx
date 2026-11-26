import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "Court Trips: tennis, pickleball and padel trips";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// The site's typeface. Google serves TTF to requests without a browser user agent,
// which is a format next/og can read; on failure we fall back to the default font.
async function schibsted(weight: number) {
  try {
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@${weight}`)).text();
    const url = css.match(/src: url\((.+?)\)/)?.[1];
    return url ? await (await fetch(url)).arrayBuffer() : null;
  } catch {
    return null;
  }
}

// The brand artwork, read from public/brand when the image is built.
async function art(file: string, type: string) {
  const bytes = await readFile(join(process.cwd(), "public/brand", file));
  return `data:${type};base64,${bytes.toString("base64")}`;
}

// Default link preview, for every page without a photo of its own: the logo, the home page's
// headline and the illustration, on the brand's warm paper. Trip and resort pages share their photos.
export default async function OpengraphImage() {
  const [bold, medium, logo, illustration] = await Promise.all([
    schibsted(800),
    schibsted(500),
    art("logo.svg", "image/svg+xml"),
    art("illustration-640.png", "image/png"),
  ]);
  const fonts = [
    ...(bold ? [{ name: "Schibsted Grotesk", data: bold, weight: 800 as const }] : []),
    ...(medium ? [{ name: "Schibsted Grotesk", data: medium, weight: 500 as const }] : []),
  ];
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          background: "#faf8f1",
          padding: "56px 56px 56px 64px",
          color: "#16233a",
          fontFamily: fonts.length ? "Schibsted Grotesk" : undefined,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 600, height: "100%" }}>
          {/* the lockup's box starts with the emblem's clear space: pull it back so the emblem lines up with the text */}
          <img src={logo} width={322} height={77} alt="" style={{ marginLeft: -8 }} />
          {/* explicit lines: next/og has no text-wrap: balance */}
          <div style={{ display: "flex", flexDirection: "column", fontSize: 60, fontWeight: 800, lineHeight: 1.04, letterSpacing: -2 }}>
            <span>Play tennis,</span>
            <span>pickleball and padel</span>
            <span>somewhere new</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", fontSize: 26, fontWeight: 500, lineHeight: 1.35 }}>
            <span>Coached camps, clinics and getaways</span>
            <span style={{ color: "#2d5d8c" }}>courttrips.com</span>
          </div>
        </div>
        <div style={{ display: "flex", flex: 1, justifyContent: "flex-end" }}>
          <img src={illustration} width={468} height={468} alt="" />
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
