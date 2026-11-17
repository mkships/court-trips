import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// The favicon mark as a PNG for iOS home screens, which don't take SVG. iOS rounds the corners
// itself, so the court green runs to the edges instead of leaving transparent corners.
export default async function AppleIcon() {
  const svg = await readFile(join(process.cwd(), "src/app/icon.svg"), "utf8");
  const src = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#3a6e52" }}>
        <img src={src} width={180} height={180} alt="" />
      </div>
    ),
    size,
  );
}
