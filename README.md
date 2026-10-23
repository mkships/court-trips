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

## Deploy (Vercel)

The Vercel project's root directory is `web`. Photos are served from Vercel Blob:

1. In Vercel, open **Storage → Create → Blob**, connect it to this project, and copy its `BLOB_READ_WRITE_TOKEN` into `web/.env.local` (see `web/.env.example`).
2. Run `npm run photos:upload` in `web`. It uploads any photos Blob doesn't have yet and prints `NEXT_PUBLIC_PHOTO_BASE_URL`.
3. Add `NEXT_PUBLIC_PHOTO_BASE_URL` (and `NEXT_PUBLIC_SITE_URL`) to the project's environment variables, then redeploy.

Photo files are named by content hash, so they're cached for a year and never go stale. After re-running `seed.py`, run `npm run photos:upload` again; add `-- --prune` to delete photos the site no longer uses. A Vercel build without `NEXT_PUBLIC_PHOTO_BASE_URL` fails on purpose, rather than deploying broken images.
