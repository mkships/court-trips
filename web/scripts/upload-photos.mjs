#!/usr/bin/env node
/**
 * Uploads the site's photos (public/photos, built by scripts/seed.py) to Vercel Blob.
 *
 * Photos are named by content hash, so an existing pathname never changes: we upload only
 * what Blob doesn't have yet and let CDNs cache each file for a year. With --prune, photos
 * no longer referenced by src/data/seed.json are deleted from Blob.
 *
 * Needs BLOB_READ_WRITE_TOKEN (Vercel → Storage → your Blob store → .env.local).
 * Usage: npm run photos:upload [-- --prune]
 */
import { del, list, put } from "@vercel/blob";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const WEB = path.dirname(path.dirname(new URL(import.meta.url).pathname));
const PHOTOS = path.join(WEB, "public", "photos");
const SEED = path.join(WEB, "src", "data", "seed.json");
const CONCURRENCY = 6;
const YEAR = 60 * 60 * 24 * 365;

if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error("BLOB_READ_WRITE_TOKEN is not set. Add it to web/.env.local (see README) and try again.");
  process.exit(1);
}

// pathnames the site actually uses: each original ("photos/sani-resort/0-1a2b3c4d5e.jpg", kept for
// link previews) plus its pre-made widths ("...-w960.webp", see scripts/photo-variants.mjs)
const seed = JSON.parse(await readFile(SEED, "utf8"));
const sizes = JSON.parse(await readFile(path.join(WEB, "src", "lib", "photo-sizes.json"), "utf8"));
const originals = [...seed.listings, ...seed.venues, ...Object.values(seed.programs)].flatMap((r) =>
  r.photos.map((p) => p.slice(1)),
);
const referenced = new Set(
  originals.flatMap((p) => [p, ...sizes.widths.map((w) => p.replace(/\.jpg$/, `-w${w}.${sizes.format}`))]),
);
const CONTENT_TYPES = { jpg: "image/jpeg", webp: "image/webp", avif: "image/avif" };

async function listAll(prefix) {
  const blobs = [];
  let cursor;
  do {
    const page = await list({ prefix, cursor, limit: 1000 });
    blobs.push(...page.blobs);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return blobs;
}

async function localFiles() {
  const files = [];
  for (const slug of await readdir(PHOTOS)) {
    for (const name of await readdir(path.join(PHOTOS, slug)).catch(() => [])) {
      if (/\.(jpg|webp|avif)$/.test(name)) files.push(`photos/${slug}/${name}`);
    }
  }
  return files;
}

async function inBatches(items, fn) {
  for (let i = 0; i < items.length; i += CONCURRENCY) await Promise.all(items.slice(i, i + CONCURRENCY).map(fn));
}

const existing = new Map((await listAll("photos/")).map((b) => [b.pathname, b.url]));
const missingLocally = [...referenced].filter((p) => !existing.has(p));
const local = new Set(await localFiles());
const notOnDisk = missingLocally.filter((p) => !local.has(p));
if (notOnDisk.length) {
  console.error(`These photos are in seed.json but not on disk; run python3 scripts/seed.py (or npm run photos:prepare) first:\n  ${notOnDisk.join("\n  ")}`);
  process.exit(1);
}

let uploaded = 0;
await inBatches(missingLocally, async (pathname) => {
  const body = await readFile(path.join(WEB, "public", pathname));
  const blob = await put(pathname, body, {
    access: "public",
    addRandomSuffix: false,
    contentType: CONTENT_TYPES[pathname.split(".").pop()],
    cacheControlMaxAge: YEAR,
  });
  existing.set(pathname, blob.url);
  uploaded++;
  process.stdout.write(`\ruploaded ${uploaded}/${missingLocally.length}`);
});
if (uploaded) process.stdout.write("\n");

if (process.argv.includes("--prune")) {
  const stale = [...existing.keys()].filter((p) => !referenced.has(p));
  if (stale.length) await del(stale.map((p) => existing.get(p)));
  console.log(`pruned ${stale.length} unreferenced photos`);
}

const anyUrl = existing.values().next().value;
if (!anyUrl) {
  console.error("Nothing in Blob and nothing to upload.");
  process.exit(1);
}
const base = new URL(anyUrl).origin;
console.log(`${uploaded} uploaded, ${referenced.size} referenced (${new Set(originals).size} photos), all present in Blob.`);
console.log(`\nSet this in Vercel (Project → Settings → Environment Variables) and redeploy:\n  NEXT_PUBLIC_PHOTO_BASE_URL=${base}`);
