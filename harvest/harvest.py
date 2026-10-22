#!/usr/bin/env python3
"""
Racket Retreats harvester.

Pipeline: load target URLs -> run firecrawl agent per URL -> strip CLI wrapper ->
backfill from spreadsheet hints -> validate -> dedup -> land in SQLite.

Design notes:
- Instance-grain landing (one row per retreat as found). Grouping/dedup-by-brand
  is DEFERRED to a later transform (schema-on-read). Raw responses are kept
  losslessly in raw_extractions + .firecrawl/raw/ so no decision is foreclosed.
- Resumable: a source already 'done' is skipped unless --force.
- Concurrency capped at 2 (Firecrawl plan limit).

Commands:
  load                          parse target_urls.xlsx into the sources table
  run [--sport S] [--limit N]   extract pending sources, land records
  report                        coverage + progress stats
  export [--out FILE]           dump landed retreats to JSON
"""
import argparse, sqlite3, subprocess, json, hashlib, os, sys, time
import datetime as dt
import zipfile, xml.etree.ElementTree as ET
import urllib.parse as up
from concurrent.futures import ThreadPoolExecutor, as_completed

ROOT = os.path.dirname(os.path.abspath(__file__))
PROJ = os.path.dirname(ROOT)
DB = os.path.join(ROOT, "data.db")
SCHEMA_FILE = os.path.join(PROJ, "extraction-schema.json")
XLSX = os.path.join(PROJ, "target_urls.xlsx")
RAW_DIR = os.path.join(PROJ, ".firecrawl", "raw")
CLI = ["npx", "-y", "firecrawl-cli@1.19.6"]
MAX_WORKERS = 2
AGENT_TIMEOUT = 1000

REQUIRED = ["title", "category", "organizer", "racket_sport", "level"]

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS sources(
  url           TEXT PRIMARY KEY,
  racket_sport  TEXT,
  category_hint TEXT,
  status        TEXT DEFAULT 'pending',   -- pending|done|error|empty
  n_retreats    INTEGER DEFAULT 0,
  error         TEXT,
  scraped_at    TEXT
);
CREATE TABLE IF NOT EXISTS venues(
  dedup_key     TEXT PRIMARY KEY,   -- lower(name)|lower(country)
  source_url    TEXT,
  name          TEXT,
  kind          TEXT,
  country       TEXT,
  racket_sport  TEXT,   -- json array
  item_json     TEXT,   -- full extracted venue, lossless
  scraped_at    TEXT
);
CREATE TABLE IF NOT EXISTS raw_extractions(
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  source_url  TEXT,
  fetched_at  TEXT,
  n_retreats  INTEGER,
  raw_json    TEXT
);
CREATE TABLE IF NOT EXISTS retreats(
  dedup_key     TEXT PRIMARY KEY,
  source_url    TEXT,
  title         TEXT,
  category      TEXT,
  organizer     TEXT,
  racket_sport  TEXT,   -- json array
  level         TEXT,   -- json array
  theme         TEXT,   -- json array
  country       TEXT,
  city_region   TEXT,
  venue_name    TEXT,
  booking_url   TEXT,
  price_min     REAL,
  price_max     REAL,
  currency      TEXT,
  sessions      TEXT,   -- json
  rating        TEXT,   -- json
  item_json     TEXT,   -- full extracted item, lossless
  needs_review  INTEGER,
  review_reasons TEXT,
  scraped_at    TEXT
);
"""

def db():
    conn = sqlite3.connect(DB, timeout=30)
    conn.row_factory = sqlite3.Row
    conn.executescript(SCHEMA_SQL)
    return conn

def now():
    return dt.datetime.now().isoformat(timespec="seconds")

# ---------- xlsx ----------
def read_xlsx(path):
    NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
    z = zipfile.ZipFile(path)
    ss = []
    for si in ET.fromstring(z.read("xl/sharedStrings.xml")):
        ss.append("".join(t.text or "" for t in si.iter(NS + "t")))
    def colnum(ref):
        c = "".join(ch for ch in ref if ch.isalpha()); n = 0
        for ch in c: n = n * 26 + (ord(ch) - 64)
        return n - 1
    sx = ET.fromstring(z.read("xl/worksheets/sheet1.xml"))
    rows = []
    for row in sx.iter(NS + "row"):
        cells = {}
        for c in row.findall(NS + "c"):
            v = c.find(NS + "v")
            if v is None: continue
            val = v.text
            if c.get("t") == "s": val = ss[int(val)]
            cells[colnum(c.get("r"))] = val
        if cells:
            mx = max(cells); rows.append([cells.get(i, "") for i in range(mx + 1)])
    return rows

def cmd_load(args):
    rows = read_xlsx(XLSX)
    data = rows[1:]
    conn = db()
    n = 0
    for r in data:
        url = (r[0] if len(r) > 0 else "").strip()
        if not url: continue
        sport = r[1] if len(r) > 1 else ""
        cat = r[2] if len(r) > 2 else ""
        conn.execute(
            "INSERT INTO sources(url,racket_sport,category_hint) VALUES(?,?,?) "
            "ON CONFLICT(url) DO UPDATE SET racket_sport=excluded.racket_sport, "
            "category_hint=excluded.category_hint",
            (url, sport, cat))
        n += 1
    conn.commit()
    total = conn.execute("SELECT COUNT(*) FROM sources").fetchone()[0]
    print(f"loaded/updated {n} target URLs ({total} total in sources)")

# ---------- agent ----------
def run_agent(url, sport_hint, cat_hint):
    prompt = (
        f"Extract every {sport_hint} retreat, camp, clinic, or getaway listed on this page "
        f"into the schema. Each distinct program (by location and/or date) is one item in retreats[]. "
        f"This page is primarily categorized as: {cat_hint}. "
        f"Capture all session dates (YYYY-MM-DD), locations, prices, coaches, inclusions, and skill "
        f"rating ranges (DUPR for pickleball, UTR/NTRP for tennis) wherever shown. "
        f"Set pricing.price_unit from how the price is quoted (per person vs per person sharing a room). "
        f"If the page describes the resort, hotel, club or academy itself, add it to venues[]. "
        f"Do not invent data; leave unknown fields null. Keep sold-out items and mark their session status."
    )
    cmd = CLI + ["agent", prompt, "--urls", url, "--schema-file", SCHEMA_FILE, "--wait"]
    p = subprocess.run(cmd, capture_output=True, text=True, timeout=AGENT_TIMEOUT)
    out = p.stdout
    marker = out.find("Result:")
    blob = out[marker + 7:] if marker >= 0 else out
    i = blob.find("{")
    if i < 0:
        # surface the failure reason (e.g. refusal)
        tail = (out + p.stderr)[-400:].replace("\r", " ")
        raise ValueError("no JSON in agent output: ..." + tail)
    data = json.loads(blob[i:])
    if not isinstance(data, dict):
        return [], []
    return data.get("retreats") or [], data.get("venues") or []

# ---------- land ----------
def first_token(s):
    return (s or "").split(",")[0].strip()

def backfill(item, sport_hint, cat_hint):
    if not item.get("racket_sport"):
        toks = [t.strip() for t in (sport_hint or "").split(",") if t.strip()]
        if toks: item["racket_sport"] = toks
    if not item.get("category"):
        ft = first_token(cat_hint)
        if ft: item["category"] = ft
    return item

def validate(item):
    reasons = []
    for f in REQUIRED:
        if not item.get(f): reasons.append(f"missing {f}")
    if not (item.get("location") or {}).get("country"):
        reasons.append("missing country")
    if not (item.get("sessions") or item.get("schedule_notes")):
        reasons.append("missing dates")
    return reasons

def dedup_key(item, source_url):
    bk = (item.get("booking_url") or "").strip()
    if bk: return "u:" + bk
    h = hashlib.sha1((source_url + "|" + (item.get("title") or "")).encode()).hexdigest()[:16]
    return "h:" + h

def land(conn, source_url, items, sport_hint, cat_hint):
    landed = 0
    for raw_item in items:
        item = backfill(dict(raw_item), sport_hint, cat_hint)
        if not item.get("booking_url"):
            item["booking_url"] = source_url  # fallback per schema rule
        reasons = validate(item)
        loc = item.get("location") or {}
        pr = item.get("pricing") or {}
        conn.execute(
            "INSERT OR IGNORE INTO retreats(dedup_key,source_url,title,category,organizer,"
            "racket_sport,level,theme,country,city_region,venue_name,booking_url,"
            "price_min,price_max,currency,sessions,rating,item_json,needs_review,review_reasons,scraped_at)"
            " VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (dedup_key(item, source_url), source_url, item.get("title"), item.get("category"),
             item.get("organizer"), json.dumps(item.get("racket_sport")), json.dumps(item.get("level")),
             json.dumps(item.get("theme")), loc.get("country"), loc.get("city_region"), loc.get("venue_name"),
             item.get("booking_url"), pr.get("price_min"), pr.get("price_max"), pr.get("currency"),
             json.dumps(item.get("sessions")), json.dumps(item.get("rating")), json.dumps(item, ensure_ascii=False),
             1 if reasons else 0, "; ".join(reasons), now()))
        landed += 1
    return landed

def land_venues(conn, source_url, venues):
    for v in venues:
        country = (v.get("location") or {}).get("country")
        if not v.get("name"):
            continue
        conn.execute(
            "INSERT OR REPLACE INTO venues(dedup_key,source_url,name,kind,country,racket_sport,item_json,scraped_at)"
            " VALUES(?,?,?,?,?,?,?,?)",
            (f"{v['name'].strip().lower()}|{(country or '').strip().lower()}", source_url, v["name"], v.get("kind"),
             country, json.dumps(v.get("racket_sport")), json.dumps(v, ensure_ascii=False), now()))
    return len(venues)

def cache_raw(source_url, items, venues):
    os.makedirs(RAW_DIR, exist_ok=True)
    h = hashlib.sha1(source_url.encode()).hexdigest()[:16]
    with open(os.path.join(RAW_DIR, h + ".json"), "w") as f:
        json.dump({"source_url": source_url, "fetched_at": now(), "retreats": items, "venues": venues},
                  f, ensure_ascii=False, indent=2)

def cmd_run(args):
    conn = db()
    q = "SELECT url,racket_sport,category_hint FROM sources WHERE status!='done'"
    params = []
    if args.sport:
        q += " AND racket_sport LIKE ?"; params.append(f"%{args.sport}%")
    if not args.force:
        pass
    else:
        q = q.replace("WHERE status!='done'", "WHERE 1=1")
    q += " ORDER BY url"
    if args.limit:
        q += f" LIMIT {int(args.limit)}"
    targets = conn.execute(q, params).fetchall()
    if not targets:
        print("nothing pending. (use --force to re-run done sources)"); return
    print(f"[{now()}] running {len(targets)} sources, {MAX_WORKERS} at a time...\n", flush=True)

    def work(row):
        t0 = time.time()
        try:
            items, venues = run_agent(row["url"], row["racket_sport"], row["category_hint"])
            return (row, items, venues, None, time.time() - t0)
        except Exception as e:
            return (row, None, None, str(e)[:500], time.time() - t0)

    done = 0
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as ex:
        futs = {ex.submit(work, r): r for r in targets}
        for fut in as_completed(futs):
            row, items, venues, err, secs = fut.result()
            url = row["url"]
            done += 1
            if err is not None:
                conn.execute("UPDATE sources SET status='error',error=?,scraped_at=? WHERE url=?",
                             (err, now(), url))
                conn.commit()
                print(f"[{done}/{len(targets)}] ERROR  ({secs:4.0f}s)  {url}\n         {err[:160]}", flush=True)
                continue
            cache_raw(url, items, venues)
            conn.execute("INSERT INTO raw_extractions(source_url,fetched_at,n_retreats,raw_json) VALUES(?,?,?,?)",
                         (url, now(), len(items),
                          json.dumps({"retreats": items, "venues": venues}, ensure_ascii=False)))
            landed = land(conn, url, items, row["racket_sport"], row["category_hint"])
            land_venues(conn, url, venues)
            status = "done" if items else "empty"
            conn.execute("UPDATE sources SET status=?,n_retreats=?,error=NULL,scraped_at=? WHERE url=?",
                         (status, len(items), now(), url))
            conn.commit()
            print(f"[{done}/{len(targets)}] OK     ({secs:4.0f}s)  {len(items):3d} found  {len(venues):2d} venues  {url}", flush=True)
    cmd_report(args)

def cmd_report(args):
    conn = db()
    s = conn.execute("SELECT status,COUNT(*) c FROM sources GROUP BY status").fetchall()
    print("\n=== SOURCES ===")
    for r in s: print(f"  {r['status']:8} {r['c']}")
    tot = conn.execute("SELECT COUNT(*) FROM retreats").fetchone()[0]
    rev = conn.execute("SELECT COUNT(*) FROM retreats WHERE needs_review=1").fetchone()[0]
    print(f"\n=== RETREATS ===\n  landed: {tot}   needs_review: {rev}   clean: {tot-rev}")
    if tot:
        for col in ["category", "country"]:
            rows = conn.execute(f"SELECT {col},COUNT(*) c FROM retreats GROUP BY {col} ORDER BY c DESC LIMIT 8").fetchall()
            print(f"  by {col}: " + ", ".join(f"{(r[col] or '∅')}:{r['c']}" for r in rows))
        cov = lambda c: conn.execute(f"SELECT ROUND(100.0*COUNT({c})/COUNT(*)) FROM retreats").fetchone()[0]
        print(f"  coverage%  price_min:{cov('price_min')}  rating:{cov('rating')}")

def cmd_export(args):
    conn = db()
    rows = conn.execute("SELECT item_json FROM retreats").fetchall()
    out = [json.loads(r["item_json"]) for r in rows]
    venues = [json.loads(r["item_json"]) for r in conn.execute("SELECT item_json FROM venues").fetchall()]
    path = args.out or os.path.join(PROJ, "retreats_export.json")
    with open(path, "w") as f:
        json.dump({"count": len(out), "retreats": out, "venues": venues}, f, ensure_ascii=False, indent=2)
    print(f"exported {len(out)} retreats and {len(venues)} venues -> {path}")

def main():
    ap = argparse.ArgumentParser(description="Racket Retreats harvester")
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("load")
    r = sub.add_parser("run"); r.add_argument("--sport"); r.add_argument("--limit", type=int); r.add_argument("--force", action="store_true")
    sub.add_parser("report")
    e = sub.add_parser("export"); e.add_argument("--out")
    args = ap.parse_args()
    {"load": cmd_load, "run": cmd_run, "report": cmd_report, "export": cmd_export}[args.cmd](args)

if __name__ == "__main__":
    main()
