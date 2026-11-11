// @ts-check
// Stores a listing photo the way the site expects it: "/photos/<slug>/<n>-<hash>.jpg" plus the
// pre-made widths in photo-sizes.json that src/lib/image-loader.ts picks from. One place for it,
// used by the harvest import (scripts/harvest/import.mjs) and by /admin's "Add photos".
// Plain .mjs so the import script can load it without a build step.
import { put } from "@vercel/blob";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import sizes from "./photo-sizes.json" with { type: "json" };

const MAX_PX = 1800;
export const PHOTO_MIN_WIDTH = 600;
const MAX_DOWNLOAD_BYTES = 25 * 1024 * 1024;
const YEAR = 60 * 60 * 24 * 365;
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

/**
 * Downloads a photo from another site. Throws with a short reason a person can read.
 * @param {string} url
 * @returns {Promise<Buffer>}
 */
export async function fetchPhoto(url) {
  const res = await fetch(url, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const input = Buffer.from(await res.arrayBuffer());
  if (input.length > MAX_DOWNLOAD_BYTES) throw new Error("file too large");
  return input;
}

/**
 * Re-encodes a photo, makes its widths and stores them: in Vercel Blob when BLOB_READ_WRITE_TOKEN
 * is set, otherwise under `<localDir>/photos` (local development; not in git).
 * Throws when the input isn't an image or is narrower than PHOTO_MIN_WIDTH.
 * @param {{ slug: string, n: number, input: Buffer | Uint8Array, localDir: string }} photo
 *   `n` is the photo's position on the listing; `localDir` is web/public.
 * @returns {Promise<string>} the path to save in photos.path
 */
export async function storePhoto({ slug, n, input, localDir }) {
  let meta;
  try {
    meta = await sharp(input).metadata();
  } catch {
    throw new Error("not a photo we can read");
  }
  if ((meta.width ?? 0) < PHOTO_MIN_WIDTH) throw new Error(`too small (${meta.width ?? 0}px wide; ${PHOTO_MIN_WIDTH}px is the least)`);
  const jpg = await sharp(input)
    .rotate()
    .resize({ width: MAX_PX, height: MAX_PX, fit: "inside", withoutEnlargement: true })
    .flatten({ background: "#fff" })
    .jpeg({ quality: 82 })
    .toBuffer();
  const name = `${n}-${createHash("sha256").update(jpg).digest("hex").slice(0, 10)}.jpg`;
  /** @type {[string, Buffer, string][]} */
  const files = [[name, jpg, "image/jpeg"]];
  for (const w of sizes.widths) {
    const variant = await sharp(jpg).resize({ width: w, withoutEnlargement: true }).webp({ quality: sizes.quality }).toBuffer();
    files.push([name.replace(/\.jpg$/, `-w${w}.${sizes.format}`), variant, `image/${sizes.format}`]);
  }
  const toBlob = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
  // a deployed site has no disk to keep photos on
  if (!toBlob && process.env.VERCEL) throw new Error("BLOB_READ_WRITE_TOKEN is not set, so there's nowhere to store photos");
  for (const [file, body, contentType] of files) {
    if (toBlob) await put(`photos/${slug}/${file}`, body, { access: "public", addRandomSuffix: false, allowOverwrite: true, contentType, cacheControlMaxAge: YEAR });
    else {
      await mkdir(path.join(localDir, "photos", slug), { recursive: true });
      await writeFile(path.join(localDir, "photos", slug, file), body);
    }
  }
  return `/photos/${slug}/${name}`;
}
