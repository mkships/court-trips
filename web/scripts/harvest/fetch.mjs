#!/usr/bin/env node
/**
 * Harvest step 1 (no AI, free): fetch every source page, save its text, and work out what changed.
 *
 *   npm run harvest:fetch                       every page in harvest/sources.csv, plus each
 *                                               harvested program's own page (with DATABASE_URL)
 *   npm run harvest:fetch -- --region Europe    only sources in one region
 *   npm run harvest:fetch -- --match markwarner,curtainbluff   only sources whose URL or operator
 *                                               contains one of these
 *   npm run harvest:fetch -- --all              treat every page as changed (a first harvest)
 *
 * Writes the text to harvest/.cache/pages/<key>.txt and the plan to harvest/.cache/run.json:
 * which pages changed, which are new, and which were blocked (bot checks) and need a browser or
 * Claude's web tool. Nothing is marked as seen until harvest-import has used the results.
 */
import { neon } from "@neondatabase/serverless";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { closeBrowser, fetchPage, fetchWithBrowser, hashText, PAGES, pageKey, readJson, readSources, RUN, STATE, writeJson } from "./lib.mjs";

const arg = (name) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
};
const region = arg("region");
// one or more terms, comma-separated: --match markwarner,curtainbluff
const match = arg("match")?.toLowerCase().split(",").map((t) => t.trim()).filter(Boolean);
const all = process.argv.includes("--all");
const CONCURRENCY = 4;

const sources = (await readSources()).filter(
  (s) => (!region || s.region.toLowerCase() === region.toLowerCase()) && (!match || match.some((t) => `${s.url} ${s.operator}`.toLowerCase().includes(t))),
);

// each harvested program's own page too: dates and prices change there, not on the listing page
// HARVEST_DATABASE_URL: the database the harvest updates (production's), kept apart from the
// DATABASE_URL local development uses (the Neon dev branch)
const dbUrl = process.env.HARVEST_DATABASE_URL || process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
let programPages = [];
if (dbUrl && !region && !match) {
  const rows = await neon(dbUrl)`
    select slug, source_url, listing_url from programs
    where status <> 'archived' and source_url is not null and listing_url is not null`;
  const sourceUrls = new Set(sources.map((s) => s.url));
  programPages = rows.filter((r) => !sourceUrls.has(r.source_url)).map((r) => ({ url: r.source_url, kind: "program", program: r.slug, listing: r.listing_url }));
}

const state = await readJson(STATE, {});
const pages = [...sources.map((s) => ({ ...s, kind: "source" })), ...programPages];
await mkdir(PAGES, { recursive: true });
const results = [];

async function one(page) {
  let res = await fetchPage(page.url);
  if (res.blocked || page.access === "browser") {
    const viaBrowser = await fetchWithBrowser(page.url);
    if (!viaBrowser.blocked && viaBrowser.text) res = viaBrowser;
  }
  const key = pageKey(page.url);
  const file = path.join(PAGES, `${key}.txt`);
  const hash = res.text ? hashText(res.text) : null;
  const before = state[page.url]?.hash;
  const change = res.error ? "error" : res.blocked ? "blocked" : !before ? "new" : all || before !== hash ? "changed" : "unchanged";
  if (res.text) await writeFile(file, `URL: ${res.finalUrl}\n\n${res.text}\n`);
  results.push({ ...page, key, file: res.text ? path.relative(path.dirname(PAGES), file) : null, change, hash, status: res.status, error: res.error, via: res.via ?? "fetch" });
  process.stdout.write(change === "unchanged" ? "." : change[0].toUpperCase());
}

for (let i = 0; i < pages.length; i += CONCURRENCY) await Promise.all(pages.slice(i, i + CONCURRENCY).map(one));
await closeBrowser();
process.stdout.write("\n");

const count = (c) => results.filter((r) => r.change === c).length;
await writeJson(RUN, { startedAt: new Date().toISOString(), filter: { region, match, all }, pages: results });
console.log(
  `harvest:fetch: ${results.length} pages: ${count("new")} new, ${count("changed")} changed, ${count("unchanged")} unchanged, ` +
    `${count("blocked")} blocked, ${count("error")} errors. Plan: ${path.relative(process.cwd(), RUN)}`,
);
for (const r of results.filter((r) => r.change === "error" || r.change === "blocked")) console.log(`  ${r.change}: ${r.url} ${r.error ?? `HTTP ${r.status}`}`);
// exit once the output is written, so a lingering connection can't hold a scheduled run open
process.stdout.write("", () => process.exit(0));
