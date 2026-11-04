#!/usr/bin/env python3
"""
Downloads the photos for the hand-checked seed in ../seed/.

Reads seed/programs.json and seed/venues.json, downloads up to five photos per record into
public/photos/<slug>/ as content-hashed files, makes the fixed widths the site serves, and
writes data/photos.json: which file belongs to which record, in order.

The listings themselves live in Postgres: `npm run db:seed` loads seed/*.json and data/photos.json
into the database, and `npm run photos:upload` puts the files in Vercel Blob.
Photos belong to the operators: get permission (or have operators upload their own) before
anything goes public.

Usage: python3 scripts/seed.py            (from web/)
       python3 scripts/seed.py --refetch  (re-download photos)
"""
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
OUT = os.path.join(WEB, "data", "photos.json")
MAX_PX = 1800
MAX_PHOTOS = 5


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


def main():
    refetch = "--refetch" in sys.argv
    groups = {
        "programs": json.load(open(os.path.join(SEED, "programs.json"))),
        "venues": json.load(open(os.path.join(SEED, "venues.json"))),
    }
    jobs = []
    queued = {kind: {r["meta"]["slug"]: photos_for(r["meta"]["slug"], r["media"], refetch, jobs) for r in records}
              for kind, records in groups.items()}

    with ThreadPoolExecutor(8) as ex:
        paths = dict(zip((f"{slug}#{n}" for _, slug, n, _ in jobs), ex.map(fetch_photo, jobs)))
    sources = {f"{slug}#{n}": url for url, slug, n, _ in jobs}
    manifest = {
        kind: {slug: [{"path": paths[k], "source": sources[k]} for k in keys if paths[k]]
               for slug, keys in sorted(records.items())}
        for kind, records in queued.items()
    }

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
        f.write("\n")
    saved = sum(len(files) for records in manifest.values() for files in records.values())
    print(f"wrote {saved} photos for {sum(map(len, groups.values()))} records to {os.path.relpath(OUT, WEB)}")
    print("next: npm run db:seed (load into the database) and npm run photos:upload (put them in Blob)")
    # the fixed widths the site serves (see src/lib/photo-sizes.json)
    subprocess.run(["node", os.path.join(WEB, "scripts", "photo-variants.mjs")], check=True)


if __name__ == "__main__":
    main()
