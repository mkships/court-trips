// Makes the website's copies of the brand artwork (public/brand) from the kit in brand/first-light:
// the logo as a PNG for emails, and the illustration with its cream background removed, so it sits
// on any section colour.
//
//   node scripts/brand-illustration.mjs     (or: npm run brand:illustration)
//
// The artwork is a flat print: cream paper, and green, blue and lime shapes that are all darker than
// the paper. So how far a pixel is from the paper says how much ink covers it. That becomes its
// opacity, and the paper is subtracted from its colour. Nothing is redrawn: laid back over the same
// cream, the result is the original image. (An image tool's "remove background" repaints the picture
// and shifts its colours, which is why this is done by arithmetic.)

import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const here = dirname(fileURLToPath(import.meta.url));
const SOURCE = join(here, "../../brand/first-light/illustrations/court-trips-editorial-original.png");
const OUT = join(here, "../public/brand");

const PAPER = [252, 241, 224]; // the artwork's own background, measured at its corners
const NOISE = 0.04; // the paper's grain: anything this close to it is paper
const SOLID = 0.62; // the lightest ink (the lime ball) is 0.65 from the paper: from here on, opaque

const { data, info } = await sharp(SOURCE).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const out = Buffer.alloc(info.width * info.height * 4);
for (let i = 0, o = 0; i < data.length; i += 3, o += 4) {
  let distance = 0;
  for (let c = 0; c < 3; c++) distance = Math.max(distance, (PAPER[c] - data[i + c]) / PAPER[c]);
  const alpha = Math.min(1, Math.max(0, (distance - NOISE) / (SOLID - NOISE)));
  for (let c = 0; c < 3; c++) {
    // the ink's own colour, with the paper it was blended into taken back out
    const ink = alpha === 0 ? 0 : PAPER[c] + (data[i + c] - PAPER[c]) / alpha;
    out[o + c] = Math.min(255, Math.max(0, Math.round(ink)));
  }
  out[o + 3] = Math.round(alpha * 255);
}

await mkdir(OUT, { recursive: true });
const master = () => sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } });
const files = [
  ["illustration.webp", master().webp({ quality: 88, alphaQuality: 100 })],
  ["illustration-640.webp", master().resize(640).webp({ quality: 88, alphaQuality: 100 })],
  // PNG for the share image: next/og can't read WebP
  ["illustration-640.png", master().resize(640).png({ compressionLevel: 9, palette: true, quality: 95 })],
];

// The horizontal logo for emails, which can't show SVG: 400px for a 200px slot, on white so it stays
// readable when a mail app switches to a dark theme.
const LOGO = join(here, "../../brand/first-light/logos/horizontal/primary.svg");
files.push(["logo-email.png", sharp(LOGO, { density: 300 }).resize(400).flatten({ background: "#ffffff" }).png({ compressionLevel: 9 })]);

for (const [name, image] of files) {
  const { size, width, height } = await image.toFile(join(OUT, name));
  console.log(`${name}  ${width}x${height}  ${Math.round(size / 1024)} KB`);
}
