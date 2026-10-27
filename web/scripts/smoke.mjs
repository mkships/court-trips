#!/usr/bin/env node
/**
 * Post-deploy check: loads a deployment the way a visitor would and fails if anything is broken.
 *   - key pages and every program page return 200 and look like Court Trips
 *   - every photo those pages reference returns a real image (all sizes, plus link previews)
 *   - the booking hand-off (/go) redirects, and unknown pages return 404
 *
 * Usage: node scripts/smoke.mjs https://courttrips.vercel.app
 * Protected preview deployments: set VERCEL_AUTOMATION_BYPASS_SECRET.
 * Runs in CI from .github/workflows/post-deploy-check.yml after every Vercel deployment.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";

const WEB = path.dirname(path.dirname(new URL(import.meta.url).pathname));
const base = (process.argv[2] ?? process.env.DEPLOY_URL ?? "").replace(/\/$/, "");
if (!/^https?:\/\//.test(base)) {
  console.error("Usage: node scripts/smoke.mjs <deployment url>");
  process.exit(2);
}

const headers = process.env.VERCEL_AUTOMATION_BYPASS_SECRET
  ? { "x-vercel-protection-bypass": process.env.VERCEL_AUTOMATION_BYPASS_SECRET }
  : {};
const TIMEOUT_MS = 20_000;
const CONCURRENCY = 8;
const failures = [];

async function request(url, init = {}) {
  // one retry for network blips; a real fault fails twice
  for (let attempt = 1; ; attempt++) {
    try {
      return await fetch(url, { ...init, headers, signal: AbortSignal.timeout(TIMEOUT_MS) });
    } catch (error) {
      if (attempt === 2) throw error;
    }
  }
}

async function inBatches(items, fn) {
  for (let i = 0; i < items.length; i += CONCURRENCY) await Promise.all(items.slice(i, i + CONCURRENCY).map(fn));
}

const imageUrls = new Set();
function collectImages(html) {
  const decode = (s) => s.replaceAll("&amp;", "&");
  for (const [, srcset] of html.matchAll(/srcSet="([^"]+)"/g))
    for (const part of srcset.split(",")) imageUrls.add(decode(part.trim().split(/\s+/)[0]));
  for (const [, src] of html.matchAll(/<img[^>]+src="([^"]+)"/g)) imageUrls.add(decode(src));
  for (const [, og] of html.matchAll(/property="og:image" content="([^"]+)"/g)) imageUrls.add(decode(og));
}

async function checkPage(pathname, expected = 200) {
  try {
    const res = await request(base + pathname);
    const html = await res.text();
    if (res.status !== expected) return failures.push(`${pathname}: expected ${expected}, got ${res.status}`);
    if (expected === 200) {
      if (!html.includes("Court Trips")) failures.push(`${pathname}: page loaded but doesn't look like Court Trips`);
      collectImages(html);
    }
  } catch (error) {
    failures.push(`${pathname}: ${error.message}`);
  }
}

const seed = JSON.parse(await readFile(path.join(WEB, "src", "data", "seed.json"), "utf8"));
const programSlugs = Object.keys(seed.programs);

const pages = [
  "/",
  "/?sport=pickleball",
  "/?sport=padel",
  "/?type=places",
  "/search?sport=tennis",
  "/search?sport=pickleball&level=advanced",
  "/search?sport=padel&type=places",
  ...programSlugs.map((slug) => `/programs/${slug}`),
];
await inBatches(pages, (p) => checkPage(p));
await checkPage("/this-page-does-not-exist", 404);

// the booking hand-off must redirect to the operator, not render a page
try {
  const res = await request(`${base}/go/${programSlugs[0]}`, { redirect: "manual" });
  const location = res.headers.get("location") ?? "";
  if (res.status < 300 || res.status >= 400 || !/^https?:\/\//.test(location))
    failures.push(`/go/${programSlugs[0]}: expected a redirect to the operator, got ${res.status} ${location}`);
} catch (error) {
  failures.push(`/go: ${error.message}`);
}

const images = [...imageUrls].filter((u) => !u.startsWith("data:")).map((u) => new URL(u, base).toString());
const photoCount = images.filter((u) => u.includes("/photos/")).length;
if (photoCount === 0) failures.push("no photos found on any page; photo rendering is broken");

await inBatches(images, async (url) => {
  try {
    const res = await request(url);
    const type = res.headers.get("content-type") ?? "";
    await res.arrayBuffer();
    if (res.status !== 200 || !type.startsWith("image/")) failures.push(`image ${url}: ${res.status} ${type}`);
  } catch (error) {
    failures.push(`image ${url}: ${error.message}`);
  }
});

const summary = `${pages.length + 2} pages and ${images.length} images (${photoCount} photos) checked on ${base}`;
if (failures.length) {
  console.error(`✗ ${failures.length} problem(s); ${summary}\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
console.log(`✓ All good: ${summary}`);
