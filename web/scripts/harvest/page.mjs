#!/usr/bin/env node
/**
 * Prints one web page as harvest text (links as [text](url), photos as [image: url]), the same way
 * harvest:fetch reads source pages. /harvest uses it to open each program's own page.
 *
 *   npm run harvest:page -- https://example.com/camp
 */
import { closeBrowser, fetchPage, fetchWithBrowser } from "./lib.mjs";

const url = process.argv[2];
if (!url) {
  console.error("usage: npm run harvest:page -- <url>");
  process.exit(1);
}
let res = await fetchPage(url);
if (res.blocked) res = await fetchWithBrowser(url);
await closeBrowser();
if (res.error || res.blocked || !res.text) {
  console.error(`couldn't read ${url}: ${res.error ?? (res.blocked ? "blocked by a bot check" : `HTTP ${res.status}`)}`);
  process.exit(2);
}
console.log(`URL: ${res.finalUrl}\n\n${res.text}`);
// exit once the output is written, so a lingering connection can't hold a scheduled run open
process.stdout.write("", () => process.exit(0));
