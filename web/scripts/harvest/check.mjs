#!/usr/bin/env node
/**
 * Checks every listing file in harvest/out/ against the import rules (scripts/harvest/validate.mjs)
 * without touching the database. /harvest runs it before finishing; harvest:import runs the same
 * rules and refuses files with errors.
 *
 *   npm run harvest:check
 */
import { readdir } from "node:fs/promises";
import path from "node:path";
import { OUT, readJson, REPORT } from "./lib.mjs";
import { validate, validateVenue } from "./validate.mjs";

const files = (await readdir(OUT).catch(() => [])).filter((f) => f.endsWith(".json") && !f.startsWith("_"));
const slugs = new Map();
let errorCount = 0;
let warningCount = 0;
for (const f of files.sort()) {
  const raw = await readJson(path.join(OUT, f), null);
  if (!raw) {
    console.log(`✗ ${f}: not valid JSON`);
    errorCount++;
    continue;
  }
  const { errors, warnings, record } = validate(raw, f);
  if (record.slug) {
    if (slugs.has(record.slug)) errors.push(`same slug as ${slugs.get(record.slug)}`);
    slugs.set(record.slug, f);
  }
  errorCount += errors.length;
  warningCount += warnings.length;
  if (errors.length || warnings.length) {
    console.log(`${errors.length ? "✗" : "·"} ${f}`);
    for (const e of errors) console.log(`    error: ${e}`);
    for (const w of warnings) console.log(`    warning: ${w}`);
  }
}

for (const f of (await readdir(path.join(OUT, "venues")).catch(() => [])).filter((f) => f.endsWith(".json")).sort()) {
  const raw = await readJson(path.join(OUT, "venues", f), null);
  const { errors, warnings, record } = raw ? validateVenue(raw, f) : { errors: ["not valid JSON"], warnings: [], record: {} };
  if (record.slug) slugs.set(record.slug, `venues/${f}`);
  errorCount += errors.length;
  warningCount += warnings.length;
  if (errors.length || warnings.length) {
    console.log(`${errors.length ? "✗" : "·"} venues/${f}`);
    for (const e of errors) console.log(`    error: ${e}`);
    for (const w of warnings) console.log(`    warning: ${w}`);
  }
}

const report = await readJson(REPORT, null);
if (!report) console.log(`✗ ${path.relative(process.cwd(), REPORT)} is missing: list every page you were given`);
else {
  const named = new Set(report.pages?.flatMap((p) => p.programs ?? []) ?? []);
  for (const slug of slugs.keys()) if (!named.has(slug)) console.log(`· ${slug} isn't listed under any page in _report.json`);
}
console.log(`harvest:check: ${files.length} files, ${errorCount} errors, ${warningCount} warnings`);
process.exit(errorCount || !report ? 1 : 0);
