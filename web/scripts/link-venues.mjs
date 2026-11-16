#!/usr/bin/env node
/**
 * One-off: link existing programs to the venues they name (see scripts/harvest/venue-link.mjs).
 *
 *   node --env-file-if-exists=.env.local scripts/link-venues.mjs            report only, changes nothing
 *   node --env-file-if-exists=.env.local scripts/link-venues.mjs --apply    link programs to venues that already exist
 *   ... --apply --create                                                    and make draft venues for the rest
 *
 * Uses the same database as the harvest import: HARVEST_DATABASE_URL (production) when set, else
 * this checkout's DATABASE_URL. Pass --dev to use DATABASE_URL regardless.
 */
import { neon } from "@neondatabase/serverless";
import { linkVenues } from "./harvest/venue-link.mjs";

const flag = (name) => process.argv.includes(name);
const local = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
const url = flag("--dev") ? local : process.env.HARVEST_DATABASE_URL || local;
if (!url) {
  console.error("No database: set DATABASE_URL (npx neon checkout dev) or HARVEST_DATABASE_URL.");
  process.exit(1);
}

const write = flag("--apply");
const create = flag("--create");
console.log(`link-venues: ${new URL(url).host}${write ? "" : " (report only; --apply to write)"}\n`);

const { linked, created, unmatched } = await linkVenues(neon(url), { write, create });
const section = (title, lines) => console.log(`${title} (${lines.length})\n${lines.map((l) => `  ${l}`).join("\n") || "  none"}\n`);
section(write ? "Linked" : "Would link", linked);
if (create) section(write ? "Draft venues made, to review in admin" : "Would make draft venues", created);
section(create ? "Left alone: not a place name" : "No venue with this name yet (add --create to make drafts)", unmatched);
