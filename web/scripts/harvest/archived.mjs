#!/usr/bin/env node
// Prints archived programs (rejected or retired on purpose) so /harvest doesn't write them again.
import { neon } from "@neondatabase/serverless";

// HARVEST_DATABASE_URL: the database the harvest updates (production's), kept apart from the
// DATABASE_URL local development uses (the Neon dev branch)
const url = process.env.HARVEST_DATABASE_URL || process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) {
  console.log("no DATABASE_URL: can't check archived programs; harvest:import skips them anyway");
  process.exit(0);
}
const rows = await neon(url)`select slug, title, source_url from programs where status = 'archived' order by slug`;
if (!rows.length) console.log("no archived programs");
for (const r of rows) console.log(`${r.slug}\t${r.title}\t${r.source_url ?? ""}`);
