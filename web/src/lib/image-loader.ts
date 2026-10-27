import sizes from "./photo-sizes.json";

// next/image loader: every photo already exists at fixed widths (scripts/photo-variants.mjs),
// so pick the smallest one that covers the requested width instead of resizing on demand.
// "/photos/x/0-ab12.jpg" at 700px -> "/photos/x/0-ab12-w960.webp" (relative or on Blob).
const WIDTHS = [...sizes.widths].sort((a, b) => a - b);

export default function photoLoader({ src, width }: { src: string; width: number }) {
  if (!/\/photos\/[^/]+\/\d+-[0-9a-f]+\.jpg$/.test(src)) return src;
  const w = WIDTHS.find((candidate) => candidate >= width) ?? WIDTHS[WIDTHS.length - 1];
  return src.replace(/\.jpg$/, `-w${w}.${sizes.format}`);
}
