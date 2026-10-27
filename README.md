# Court Trips

A directory of tennis, pickleball and padel trips: camps, clinics, getaways and the places that host them. Court Trips links out; you book with the operator.

| Folder / file | What it is |
|---|---|
| `web/` | The site (Next.js + Tailwind). See `web/scripts/seed.py` for how it gets its data. |
| `seed/` | Hand-checked seed data: 27 programs and 6 venues. Start with `seed/README.md`. |
| `directory-schema.json` | The data model for programs and venues (v2.2). |
| `extraction-schema.json` | The contract the harvester gives the Firecrawl agent. |
| `harvest/` | Scraper that pulls listings from the sources in `target_urls.xlsx`. |

## Run the site

```bash
cd web
npm install
python3 scripts/seed.py   # downloads operator photos into public/photos and builds src/data/seed.json
npm run dev
```

Locally, photos are served from `web/public/photos` (not in git).

## Photos

`seed.py` downloads each listing's photos into `web/public/photos` (not in git) as content-hashed originals, then makes fixed widths with `npm run photos:prepare` (480, 960 and 1600px WebP; see `web/src/lib/photo-sizes.json`). The site's image loader picks the right width directly, so nothing is resized while a visitor waits. If a photo ever fails to load, the card shows the sport's court instead of a broken image.

## Deploy (Vercel)

The Vercel project's root directory is `web`. Photos are served from Vercel Blob:

1. In Vercel, create a **Blob** store (Storage → Create Database → Blob, Public access) connected to this project, and put its `BLOB_READ_WRITE_TOKEN` in `web/.env.local` (see `web/.env.example`).
2. Run `npm run photos:upload` in `web`. It makes any missing sizes, uploads what Blob doesn't have yet, checks every photo the site uses is there, and prints `NEXT_PUBLIC_PHOTO_BASE_URL`.
3. Add `NEXT_PUBLIC_PHOTO_BASE_URL` (and, once you have a domain, `NEXT_PUBLIC_SITE_URL`) to the project's environment variables, then redeploy.

Files are named by content hash, so they're cached for a year and never go stale. After re-running `seed.py`, run `npm run photos:upload` again; add `-- --prune` to delete photos the site no longer uses. A Vercel build without `NEXT_PUBLIC_PHOTO_BASE_URL` fails on purpose, rather than deploying broken images.

## Post-deploy check

`.github/workflows/post-deploy-check.yml` runs `web/scripts/smoke.mjs` against every deployment Vercel finishes: key pages, all program pages, every photo, the `/go` hand-off and the 404 page. Run it yourself with `npm run smoke -- https://courttrips.vercel.app`.

- Preview deployments are protected by Vercel, so the check needs `VERCEL_AUTOMATION_BYPASS_SECRET` as a GitHub Actions secret (Vercel → Settings → Deployment Protection → Protection Bypass for Automation).
- To hold a production release until the check passes, add **Post-deploy check** under Vercel → Settings → Deployment Checks.
