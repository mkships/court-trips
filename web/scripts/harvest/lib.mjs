// Shared by the harvest scripts: where things live, the source list, and turning a web page into
// plain text that keeps its links and images (what Claude reads to fill in listings).
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const WEB = path.dirname(path.dirname(path.dirname(new URL(import.meta.url).pathname)));
export const ROOT = path.dirname(WEB);
export const HARVEST = path.join(ROOT, "harvest");
export const SOURCES = path.join(HARVEST, "sources.csv");
// page text, run plans, logs, and what each page looked like last time: local to the machine that
// runs the refresh (harvest/refresh.sh), not in git
export const CACHE = path.join(HARVEST, ".cache");
export const STATE = path.join(CACHE, "state.json");
export const PAGES = path.join(CACHE, "pages");
export const RUN = path.join(CACHE, "run.json");
// one JSON file per program, written by Claude (/harvest) and read by harvest-import
export const OUT = path.join(HARVEST, "out");
export const REPORT = path.join(OUT, "_report.json");

export const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

export const pageKey = (url) => createHash("sha1").update(url).digest("hex").slice(0, 12);
export const hashText = (text) => createHash("sha256").update(text).digest("hex").slice(0, 16);

export async function readJson(file, fallback) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    return fallback;
  }
}

export async function writeJson(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(value, null, 2) + "\n");
}

// RFC 4180-ish: quoted fields, doubled quotes, commas inside quotes
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  const [header, ...body] = rows.filter((r) => r.some((f) => f.trim()));
  return body.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ""])));
}

// The pages to harvest: everything in sources.csv apart from dropped rows and unresolved leads.
export async function readSources() {
  const rows = parseCsv(await readFile(SOURCES, "utf8"));
  return rows
    .filter((r) => r.url && !["drop", "lead"].includes(r.status))
    .map((r) => ({ ...r, est_programs: Number(r.est_programs) || 0 }));
}

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—", euro: "€", pound: "£", hellip: "…", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", bull: "•", middot: "·", times: "×", deg: "°", copy: "©", reg: "®", trade: "™" };
const decode = (s) =>
  s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e) => {
    if (e[0] === "#") {
      const n = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });

const absolute = (href, base) => {
  try {
    return new URL(decode(href), base).toString();
  } catch {
    return null;
  }
};

// Visible text, with links as "[text](url)" and photos as "[image: url]", so dates, prices and the
// program pages a listing links to all survive. Scripts, styles and navigation chrome go.
export function htmlToText(html, baseUrl) {
  const images = new Set();
  for (const [, url] of html.matchAll(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)/gi)) images.add(absolute(url, baseUrl));
  let s = html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|svg|iframe|template)\b[\s\S]*?<\/\1>/gi, " ")
    // menus and footers are the same on every page: noise for reading, and they'd make every page look changed
    .replace(/<(footer|nav)\b[\s\S]*?<\/\1>/gi, " ");
  s = s.replace(/<img\b[^>]*>/gi, (tag) => {
    const src = tag.match(/\b(?:data-src|src)=["']([^"']+)["']/i)?.[1];
    const url = src && absolute(src, baseUrl);
    if (!url || !/\.(jpe?g|png|webp|avif)(\?|$)|imagedelivery|cloudinary|images\.|\/image\//i.test(url) || /logo|icon|sprite|pixel|badge/i.test(url)) return " ";
    images.add(url);
    return ` [image: ${url}] `;
  });
  s = s.replace(/<a\b[^>]*href=["']([^"'#][^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi, (_, href, inner) => {
    const url = absolute(href, baseUrl);
    const text = inner.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (!url || /^(mailto|tel|javascript):/i.test(href)) return ` ${text} `;
    // Markdown-style, so the tag-stripping below leaves it alone
    return ` [${text || "link"}](${url}) `;
  });
  s = s
    .replace(/<\/(p|div|li|tr|h[1-6]|section|article|br|dd|dt)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
  s = decode(s)
    .split("\n")
    .map((line) => line.replace(/[ \t ]+/g, " ").trim())
    .filter(Boolean)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");
  const og = [...images].filter(Boolean).slice(0, 1);
  return og.length ? `[cover: ${og[0]}]\n${s}` : s;
}

// A bot-check interstitial rather than the page (Cloudflare and the like). Forms with reCAPTCHA on
// otherwise normal pages don't count.
const isChallenge = (html) =>
  /<title>\s*(Just a moment|Attention Required|Checking your browser|Access denied|Please wait)/i.test(html) ||
  (html.length < 40000 && /cf-chl|challenge-platform|cf_chl_opt/i.test(html));

// Fetch one page as text. `blocked` means a bot check or a refusal: a real browser (or Claude's own
// web tool) has to read it instead.
export async function fetchPage(url, { timeoutMs = 30000 } = {}) {
  try {
    const res = await fetch(url, { headers: { "user-agent": UA, accept: "text/html,*/*" }, redirect: "follow", signal: AbortSignal.timeout(timeoutMs) });
    const html = await res.text();
    const challenge = isChallenge(html);
    if (res.status === 403 || res.status === 429 || res.status === 503 || challenge) return { url, finalUrl: res.url, status: res.status, blocked: true, text: "" };
    if (!res.ok) return { url, finalUrl: res.url, status: res.status, blocked: false, error: `HTTP ${res.status}`, text: "" };
    return { url, finalUrl: res.url, status: res.status, blocked: false, text: htmlToText(html, res.url) };
  } catch (error) {
    return { url, finalUrl: url, status: 0, blocked: false, error: error.cause?.code ?? error.message, text: "" };
  }
}

// With Playwright available (`npx playwright install chromium` once), blocked and script-built pages
// are opened in a headless browser; without it they're left for Claude's web tool.
// one browser for the whole run, started by whichever page needs it first
let browserLaunch;
export async function fetchWithBrowser(url) {
  try {
    // require, not import: it also finds a globally installed Playwright (NODE_PATH)
    browserLaunch ??= Promise.resolve().then(() => createRequire(import.meta.url)("playwright").chromium.launch());
    const browser = await browserLaunch;
    const page = await browser.newPage({ userAgent: UA });
    let res, html;
    try {
      res = await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
      await page.waitForTimeout(1500);
      html = await page.content();
    } finally {
      await page.close().catch(() => {});
    }
    const challenge = isChallenge(html);
    return { url, finalUrl: page.url(), status: res?.status() ?? 0, blocked: challenge, text: challenge ? "" : htmlToText(html, url), via: "browser" };
  } catch (error) {
    return { url, finalUrl: url, status: 0, blocked: true, error: `browser: ${error.message.split("\n")[0]}`, text: "" };
  }
}

export async function closeBrowser() {
  if (browserLaunch) await (await browserLaunch.catch(() => null))?.close().catch(() => {});
  browserLaunch = undefined;
}
