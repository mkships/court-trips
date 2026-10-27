#!/usr/bin/env node
/**
 * Makes the fixed-width versions of every photo in public/photos, ahead of time:
 *   photos/<slug>/0-<hash>.jpg  ->  0-<hash>-w480.webp, -w960.webp, -w1600.webp
 *
 * The site picks the right one directly (src/lib/image-loader.ts), so nothing is resized
 * while a visitor waits. Originals are content-hashed, so a variant that exists is current;
 * only missing ones are made. Widths live in src/lib/photo-sizes.json.
 *
 * Run by scripts/seed.py after downloading photos, or: npm run photos:prepare
 */
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const WEB = path.dirname(path.dirname(new URL(import.meta.url).pathname));
const PHOTOS = path.join(WEB, "public", "photos");
const { widths, format, quality } = JSON.parse(await readFile(path.join(WEB, "src", "lib", "photo-sizes.json"), "utf8"));

export const variantName = (original, width) => original.replace(/\.jpg$/, `-w${width}.${format}`);

const exists = (p) => stat(p).then(() => true, () => false);

let made = 0;
let originals = 0;
for (const slug of await readdir(PHOTOS)) {
  const folder = path.join(PHOTOS, slug);
  const names = await readdir(folder).catch(() => []);
  for (const name of names.filter((n) => /^\d+-[0-9a-f]+\.jpg$/.test(n))) {
    originals++;
    const source = path.join(folder, name);
    for (const width of widths) {
      const target = path.join(folder, variantName(name, width));
      if (await exists(target)) continue;
      // never upscale: a narrower original is saved as-is at its own width
      await sharp(source).rotate().resize({ width, withoutEnlargement: true }).webp({ quality }).toFile(target);
      made++;
    }
  }
}
console.log(`photo sizes: ${made} made, ${originals} originals x ${widths.length} widths`);
