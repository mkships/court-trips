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

// Default link preview: the brand on a tennis court, drawn to scale like the hero.
export default async function OpengraphImage() {
  const font = await schibsted(800);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#3a6e52",
          padding: 64,
          color: "#fff",
          fontFamily: font ? "Schibsted Grotesk" : undefined,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 620 }}>
          <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: -1 }}>Court Trips</div>
          {/* explicit lines: next/og has no text-wrap: balance */}
          <div style={{ display: "flex", flexDirection: "column", fontSize: 60, fontWeight: 800, lineHeight: 1.02, letterSpacing: -2 }}>
            <span>Tennis, pickleball</span>
            <span>and padel trips with</span>
            <span>coaching built in</span>
          </div>
        </div>
        <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "flex-end" }}>
          <svg width="440" height="209" viewBox="-12.2 -5.8 24.4 11.6">
            <rect x="-11.885" y="-5.485" width="23.77" height="10.97" fill="#2d5d8c" stroke="#fff" strokeWidth="0.12" />
            <path
              d="M0 -5.9V5.9M-6.4 -4.115V4.115M6.4 -4.115V4.115M-6.4 0H6.4M-11.885 -4.115H11.885M-11.885 4.115H11.885"
              stroke="#fff"
              strokeWidth="0.12"
              fill="none"
            />
          </svg>
        </div>
      </div>
    ),
    { ...size, fonts: font ? [{ name: "Schibsted Grotesk", data: font, weight: 800 }] : [] },
  );
}
