# Court Trips

A directory of tennis, pickleball and padel trips: camps, clinics, getaways and the places that host them. Court Trips links out; you book with the operator.

| Folder / file | What it is |
|---|---|
| `web/` | The site (Next.js + Tailwind). Listings come from Postgres; see **Database** below. |
| `seed/` | Hand-checked seed data: 27 programs and 6 venues, the format `npm run db:seed` imports. Start with `seed/README.md`. |
| `directory-schema.json` | The data model for programs and venues (v2.2). |
| `extraction-schema.json` | The contract the harvester gives the Firecrawl agent. |
| `harvest/` | Scraper that pulls listings from the sources in `target_urls.xlsx`. |

## Run the site

```bash
cd web
npm install
npx neon checkout dev     # points .env.local at the Neon dev branch
npm run db:migrate
npm run db:seed           # loads seed/*.json into the database
python3 scripts/seed.py   # downloads operator photos into public/photos (macOS: uses sips)
npm run dev
```

Locally, photos are served from `web/public/photos` (not in git). The site needs a database to show listings.

## Photos

`seed.py` downloads each listing's photos into `web/public/photos` (not in git) as content-hashed originals, records which file belongs to which listing in `web/data/photos.json` (in git; `db:seed` reads it), then makes fixed widths with `npm run photos:prepare` (480, 960 and 1600px WebP; see `web/src/lib/photo-sizes.json`). The site's image loader picks the right width directly, so nothing is resized while a visitor waits. If a photo ever fails to load, the card shows the sport's court instead of a broken image.

## Deploy (Vercel)

The Vercel project's root directory is `web`. Photos are served from Vercel Blob:

1. In Vercel, create a **Blob** store (Storage → Create Database → Blob, Public access) connected to this project, and put its `BLOB_READ_WRITE_TOKEN` in `web/.env.local` (see `web/.env.example`).
2. Run `npm run photos:upload` in `web`. It makes any missing sizes, uploads what Blob doesn't have yet, checks every photo the site uses is there, and prints `NEXT_PUBLIC_PHOTO_BASE_URL`.
3. Add `NEXT_PUBLIC_PHOTO_BASE_URL` (and, once you have a domain, `NEXT_PUBLIC_SITE_URL`) to the project's environment variables, then redeploy.

Files are named by content hash, so they're cached for a year and never go stale. After re-running `seed.py`, run `npm run db:seed` and `npm run photos:upload` again; add `-- --prune` to delete photos neither `data/photos.json` nor the database uses (it needs `DATABASE_URL`). A Vercel build without `NEXT_PUBLIC_PHOTO_BASE_URL` fails on purpose, rather than deploying broken images.

## Database

The site uses Neon Postgres (added through the Vercel Marketplace) with Drizzle. The schema lives in `web/src/db/schema.ts`, and migrations are generated into `web/drizzle/` and checked into git.

### Listings

The database is the source of truth for listings. `seed/*.json` is an import format.

- Tables follow `directory-schema.json` v2.2: `programs`, `sessions`, `venues`, `courts` and `photos`. Groups whose shape varies a lot (ratings, inclusions, amenities) are JSONB columns. `status`, `needs_review` and `last_seen_at` are kept from the schema.
- The site shows programs that are `active` or `sold_out` and venues that are `active`, in both cases only with `needs_review` off. Tiles (one per upcoming date) and the per-sport stats are queried from the database (`web/src/lib/db.ts`), so dates drop off once they've passed. Results are cached for an hour (tag `listings`).
- `npm run db:seed` upserts `seed/programs.json` and `seed/venues.json` by slug in one transaction. Each imported record's sessions, courts and photos are replaced by the file's. Records that are only in the database are left alone. Re-importing overwrites database edits to those records, so after the first import, edit the database instead.
- `npm run build` runs `db:seed --if-empty` after migrating. A new database (production, or a fresh preview branch) gets the seed once, and after that the build leaves the data alone.
- Hero carousel order is `programs.featured_rank` (first set from `FEATURED` in `scripts/db-seed.mjs`).

### Clicks

- Every "Book" button goes through `/go/<program>`, which redirects straight away and then saves the click to the `clicks` table: program, session date, organizer, the page it came from (or the other site's host), country and target URL. No IPs or user agents are stored. Bots, link previews, browser prefetches and the post-deploy check are not counted.
- `npm run build` applies pending migrations first (`scripts/migrate.mjs`). Each Vercel deployment migrates its own database (production, or the preview's Neon branch). A Vercel build without `DATABASE_URL` fails on purpose, so clicks can't go missing without anyone noticing.
- After changing the schema: `npm run db:generate`, then commit the new file in `web/drizzle/`. `npm run db:studio` opens a browser view of the data.
- Locally, work against the Neon `dev` branch, never production: `npx neon checkout dev` in `web` writes its URLs to `.env.local` (`web/.neon` remembers the project). Don't `vercel env pull` the database URLs.
- Agent tooling: `.mcp.json` adds the Neon MCP server (OAuth, scoped to this project) and `skills-lock.json` pins the Neon agent skills. Refresh them with `npx neon skills update -y`.

## Post-deploy check

`.github/workflows/post-deploy-check.yml` runs `web/scripts/smoke.mjs` against every deployment Vercel finishes: key pages, every program page linked from search (so whatever is in that deployment's database), every photo, the `/go` hand-off and the 404 page. Run it yourself with `npm run smoke -- https://courttrips.vercel.app`.

- Vercel starts it through a `repository_dispatch` event (Vercel → Settings → Git → repository_dispatch Events, on).
- Deployment URLs are protected by Vercel, so the check needs `VERCEL_AUTOMATION_BYPASS_SECRET` as a GitHub Actions secret (Vercel → Settings → Deployment Protection → Protection Bypass for Automation). Set.
- It reports back as **Vercel - courttrips: post-deploy-check**, which is a required Deployment Check (Vercel → Settings → Build and Deployment): a production deployment only goes live once it passes. If it fails, the previous version keeps serving.
