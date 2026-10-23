#!/usr/bin/env python3
"""
Builds the site's data from the hand-checked seed in ../seed/.

Reads seed/programs.json and seed/venues.json, takes each program's next
upcoming session, downloads up to five photos per record into
public/photos/<slug>/, and writes src/data/seed.json for the pages to import.

This is a stand-in until listings and photos live in a real database.
Photos belong to the operators: fine for a local prototype, but get
permission (or have operators upload their own) before anything goes public.

Usage: python3 scripts/seed.py            (from web/)
       python3 scripts/seed.py --refetch  (re-download photos)
"""
import datetime as dt
import glob
import hashlib
import json
import os
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor

WEB = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SEED = os.path.join(WEB, "..", "seed")
PHOTOS = os.path.join(WEB, "public", "photos")
OUT = os.path.join(WEB, "src", "data", "seed.json")
MAX_PX = 1800
MAX_PHOTOS = 5

# Shown in the hero carousel, in order. Each needs a cover photo at least ~1200px wide.
FEATURED = {
    "tennis": ["ikos-kissamos-tennis-holiday", "sani-beach-tennis-holiday", "zanzanu-tennis-camp-lake-garda"],
    "pickleball": ["pickleball-getaways-club-med-turkoise", "pickleball-in-paradise-la-toc", "active-away-pickleball-vilamoura"],
    "padel": ["active-away-padel-nana-golden-beach", "rafa-nadal-academy-padel-camp", "active-away-padel-vilamoura"],
}


def fetch_photo(job):
    """Download, resize and store one photo as <n>-<content hash>.jpg; returns its site path.

    Content-hashed names never change meaning, so Blob/CDN copies can be cached forever
    and a replaced photo always gets a new URL.
    """
    url, slug, n, refetch = job
    folder = os.path.join(PHOTOS, slug)
    existing = sorted(glob.glob(os.path.join(folder, f"{n}-*.jpg")))
    if existing and not refetch:
        return f"/photos/{slug}/{os.path.basename(existing[0])}"
    tmp = os.path.join(folder, f"{n}.download")
    legacy = os.path.join(folder, f"{n}.jpg")  # copies saved before names were hashed
    if os.path.exists(legacy) and not refetch:
        os.replace(legacy, tmp)
    elif subprocess.run(["curl", "-sfL", "-m", "40", "-A", "Mozilla/5.0", "-o", tmp, url]).returncode:
        # operators move or delete photos; keep the rest of the record rather than failing the run
        print(f"warning: photo {n} for {slug} is gone ({url}); skipping it", file=sys.stderr)
        if os.path.exists(tmp):
            os.remove(tmp)
        return None
    width = int(subprocess.run(["sips", "-g", "pixelWidth", tmp], check=True, capture_output=True, text=True)
                .stdout.split()[-1])
    # -Z would also upscale, so only pass it when the photo is larger than we need
    resize = ["-Z", str(MAX_PX)] if width > MAX_PX else []
    converted = os.path.join(folder, f"{n}.converted.jpg")
    subprocess.run(["sips", "-s", "format", "jpeg", "-s", "formatOptions", "82", *resize, tmp, "--out", converted],
                   check=True, capture_output=True)
    os.remove(tmp)
    digest = hashlib.sha256(open(converted, "rb").read()).hexdigest()[:10]
    for old in existing:
        os.remove(old)
    name = f"{n}-{digest}.jpg"
    os.replace(converted, os.path.join(folder, name))
    return f"/photos/{slug}/{name}"


def photos_for(slug, media, refetch, jobs):
    """Queue a record's photos for download; returns placeholders filled in after the downloads."""
    os.makedirs(os.path.join(PHOTOS, slug), exist_ok=True)
    keys = []
    for n, url in enumerate(media["images"][:MAX_PHOTOS]):
        jobs.append((url, slug, n, refetch))
        keys.append(f"{slug}#{n}")
    return keys


def place(location):
    return location["city_region"] or location["country"]


def main():
    refetch = "--refetch" in sys.argv
    today = dt.date.today().isoformat()
    programs = json.load(open(os.path.join(SEED, "programs.json")))
    venues = json.load(open(os.path.join(SEED, "venues.json")))
    featured = {slug: i for slugs in FEATURED.values() for i, slug in enumerate(slugs)}
    jobs = []

    # One tile per upcoming session: each date has its own price and availability.
    # Programs with no published dates (seasonal / on request) get a single undated tile.
    listings = []
    details = {}
    for p in programs:
        slug = p["meta"]["slug"]
        pricing = p["pricing"]
        photos = photos_for(slug, p["media"], refetch, jobs)
        sessions = [s for s in p["sessions"] if s["start_date"] >= today] or [{}]
        spec, cat = p["sport_specific"], p["categorization"]
        details[slug] = {
            "slug": slug,
            "title": p["core_identity"]["title"],
            "organizer": p["core_identity"]["organizer"],
            "description": p["core_identity"]["description"],
            "coaches": p["core_identity"]["coaches"],
            "languages": p["core_identity"]["languages"],
            "sports": cat["racket_sport"],
            "category": cat["category"],
            "level": cat["level"],
            "theme": cat["theme"],
            "gender": cat["gender"],
            "ratings": p["rating_systems"],
            "place": place(p["location"]),
            "country": p["location"]["country"],
            "venueName": p["location"]["venue_name"],
            "venueSlug": p["location"]["venue_slug"],
            "sessions": [{
                "start": x["start_date"], "end": x["end_date"], "status": x["status"],
                "price": x.get("price_override", pricing["price_min"]),
                "bookingUrl": x.get("booking_url"),
            } for x in sessions if x],
            "scheduleNotes": p["schedule_notes"],
            "priceMin": pricing["price_min"],
            "priceMax": pricing["price_max"],
            "currency": pricing["currency"],
            "priceUnit": pricing["price_unit"],
            "priceNotes": pricing["price_notes"],
            "inclusions": pricing["inclusions"],
            "surfaces": spec["court_surface"],
            "coachingHours": spec["coaching_hours_total"],
            "ratio": spec["player_to_coach_ratio"],
            "capacity": spec["capacity"],
            "accommodation": spec["accommodation_type"],
            "photos": photos,
            "bookingUrl": p["core_identity"]["booking_url"],
            "sourceUrl": p["meta"]["source_url"],
            "checkedAt": p["meta"]["last_seen_at"],
        }
        for s in sessions:
            listings.append({
                "key": f"{slug}@{s.get('start_date', 'tbd')}",
                "programSlug": slug,
                "sports": p["categorization"]["racket_sport"],
                "category": p["categorization"]["category"],
                "level": p["categorization"]["level"],
                "title": p["core_identity"]["title"],
                "organizer": p["core_identity"]["organizer"],
                "place": place(p["location"]),
                "country": p["location"]["country"],
                "venueSlug": p["location"]["venue_slug"],
                "start": s.get("start_date"),
                "end": s.get("end_date"),
                "status": s.get("status"),
                "scheduleNotes": p["schedule_notes"],
                "priceFrom": s.get("price_override", pricing["price_min"]),
                "currency": pricing["currency"],
                "priceUnit": pricing["price_unit"],
                "photos": photos,
                "featuredRank": featured.get(slug),
                "bookingUrl": p["core_identity"]["booking_url"],
            })
    # soonest first; undated tiles last
    listings.sort(key=lambda l: (l["start"] or "9999", l["programSlug"]))

    places = []
    for v in venues:
        slug = v["meta"]["slug"]
        places.append({
            "slug": slug,
            "name": v["core_identity"]["name"],
            "kind": v["core_identity"]["kind"],
            "sports": v["facilities"]["racket_sport"],
            "place": place(v["location"]),
            "country": v["location"]["country"],
            "courts": v["facilities"]["courts"],
            "programSlugs": v["relations"]["program_slugs"],
            "photos": photos_for(slug, v["media"], refetch, jobs),
            "website": v["core_identity"]["website"],
        })

    with ThreadPoolExecutor(8) as ex:
        paths = dict(zip((f"{slug}#{n}" for _, slug, n, _ in jobs), ex.map(fetch_photo, jobs)))
    for record in [*listings, *details.values(), *places]:
        record["photos"] = [paths[k] for k in record["photos"] if paths[k]]

    # what the hero and search bar offer: countries and months that still have a session
    stats = {}
    for sport in FEATURED:
        mine = [p for p in programs if sport in p["categorization"]["racket_sport"]]
        stats[sport] = {
            "programs": len(mine),
            "tiles": sum(1 for l in listings if sport in l["sports"]),
            "countries": sorted({p["location"]["country"] for p in mine}),
            "months": sorted({s["start_date"][:7] for p in mine for s in p["sessions"] if s["start_date"] >= today}),
        }

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w") as f:
        json.dump({"stats": stats, "listings": listings, "venues": places, "programs": details},
                  f, indent=2, ensure_ascii=False)
        f.write("\n")
    print(f"wrote {len(listings)} listings and {len(places)} venues ({len(jobs)} photos) to {os.path.relpath(OUT, WEB)}")


if __name__ == "__main__":
    main()
