# Court Trips

A directory of tennis, pickleball and padel trips: camps, clinics, getaways and the places that host them. Court Trips links out; you book with the operator.

| Folder / file | What it is |
|---|---|
| `web/` | The site (Next.js + Tailwind). Listings come from Postgres; see **Database** below. |
| `seed/` | Hand-checked seed data: 27 programs and 6 venues, the format `npm run db:seed` imports. Start with `seed/README.md`. |
| `directory-schema.json` | The data model for programs and venues (v2.2). |
| `harvest/` | The harvest: `sources.csv` (the operator pages to read; `SOURCES.md` is the readable version), the scripts that fetch, check and import listings, and the every-3-days refresh. See **Harvest** below. |

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
- `submissions` holds "List your program" entries (see **Operator submissions**).
- After changing the schema: `npm run db:generate`, then commit the new file in `web/drizzle/`. `npm run db:studio` opens a browser view of the data.
- Locally, work against the Neon `dev` branch, never production: `npx neon checkout dev` in `web` writes its URLs to `.env.local` (`web/.neon` remembers the project). Don't `vercel env pull` the database URLs.
- Agent tooling: `.mcp.json` adds the Neon MCP server (OAuth, scoped to this project) and `skills-lock.json` pins the Neon agent skills. Refresh them with `npx neon skills update -y`.

## Operator submissions

`/list-your-program` is a public form for operators (linked from the header and footer). It follows the schema's required fields, plus the optional ones players filter on.

- The form posts to a server action (`web/src/app/list-your-program/actions.ts`). It checks Cloudflare Turnstile, then validates with `web/src/lib/submission.ts`, uploads the photos to Blob (`submissions/<id>/`, unguessable names), and saves a `pending` row in the `submissions` table. `data` holds the program in `retreat_schema` shape, ready to become a draft program. A hidden honeypot field catches simple bots.
- Photos (up to 5) are shrunk in the browser to 1600px JPEGs, so a whole submission fits in Vercel's 4.5 MB request limit.
- Each submission is emailed through Resend once the visitor has seen the thank-you message, with reply-to set to the operator.
- Submitters' names and emails are stored to reply to them; no IPs.

Setup (Vercel → Settings → Environment Variables, Production; a production build fails without the first four):

| Variable | Where it comes from |
|---|---|
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | Cloudflare → Turnstile → add a widget for the site's domain |
| `RESEND_API_KEY` | Resend → API Keys (sending access) |
| `SUBMISSIONS_NOTIFY_TO` | Where the notification goes; comma-separate several |
| `RESEND_FROM` | Optional: a sender on a domain verified in Resend. Until then, `onboarding@resend.dev` only delivers to the Resend account's own address |

Previews and local builds use Cloudflare's always-pass test keys and log the email instead of sending it. `BLOB_READ_WRITE_TOKEN` comes with the Blob store already connected to the project; locally without it, photos are skipped with a warning.

## Admin

`/admin` is where listings get reviewed and edited. Only one GitHub account can sign in.

- **Review queue** (`/admin`): pending operator submissions, then programs and venues that are drafts or flagged `needs_review`. Archived ones (rejected drafts, retired listings) stay out of it, and future harvests skip them.
- **Submissions**: everything the operator sent, with their photos. "Create draft listing" makes a hidden draft program (photos included) and opens it in the editor; "Reject" keeps the record with an optional note and deletes the uploaded photos. The operator isn't emailed either way.
- **Editor** (`/admin/programs/<slug>`, `/admin/venues/<slug>`): every field, every date (past ones too), photo removal, map coordinates and the homepage carousel position. Automatic checks (`web/src/lib/admin/checks.ts`) run on each listing: errors (no dates and no schedule notes, a price without a currency…) block publishing; warnings (passed dates, a booking link whose date differs from the session's, no photos…) don't. Publish, unpublish and archive take effect on the public site straight away.
- Sign-in is GitHub OAuth with no auth library (`web/src/app/admin/auth/`): the callback asks GitHub whose account it is and signs in only `ADMIN_GITHUB_LOGIN`, with a 30-day session cookie signed with `ADMIN_SESSION_SECRET`. `web/src/middleware.ts` guards every `/admin` page, and each server action checks again. The post-deploy check confirms `/admin` redirects to the sign-in page.

Setup (Vercel → Settings → Environment Variables, Production and Preview). Without these the sign-in page lists what's missing; the rest of the site is unaffected.

| Variable | Where it comes from |
|---|---|
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | GitHub → Settings → Developer settings → OAuth Apps → New OAuth App. Homepage URL: the site; callback URL: `https://courttrips.vercel.app/admin/auth/callback`. GitHub accepts any subdomain of the callback's host, so previews on `*.vercel.app` work too. |
| `ADMIN_GITHUB_LOGIN` | Your GitHub username |
| `ADMIN_SESSION_SECRET` | Any random string of 32+ characters, e.g. `openssl rand -base64 32`. Changing it signs you out everywhere. |

Locally, `npm run dev` offers "Continue without GitHub" on the sign-in page (development only; production answers 404), so none of this is needed to work on the admin.

## Harvest

New listings and updates come from operators' own pages, listed in `harvest/sources.csv`. The work is split, so the AI part only runs where something changed:

1. **`npm run harvest:fetch`** (in `web/`, no AI): fetches every source page and every harvested program's own page. It saves their text to `harvest/.cache/pages/` and writes a plan (`harvest/.cache/run.json`) of what's new, changed, unchanged or blocked by a bot check. Blocked pages are retried in a headless browser when Playwright is installed (`npx playwright install chromium`).
2. **`/harvest`** in Claude Code (`.claude/commands/harvest.md`): reads the pages in the plan, opens each program's own page (`npm --prefix web run harvest:page -- <url>`), and writes one file per program to `harvest/out/<slug>.json` in `seed/programs.json`'s shape, plus `harvest/out/venues/` for places to stay (`target` = `venue` in `sources.csv`). It also writes `_report.json` saying which programs each page showed. It runs `npm --prefix web run harvest:check` until the files pass the import rules (`web/scripts/harvest/validate.mjs`).
3. **`npm run harvest:import`** (`-- --dry-run` to preview, `-- --email` to send the summary):
   - **New programs** become hidden drafts, with photos sized and uploaded to Blob (to `web/public/photos` without `BLOB_READ_WRITE_TOKEN`).
   - **Drafts nobody has edited** are replaced by the new reading.
   - **Live or hand-edited listings** get the safe changes straight away: new dates, a date's availability or booking link, prices within 25%. Everything else is saved as `pending_changes`, which `/admin` shows under **Proposed changes** with Apply and Dismiss.
   - **Missing programs:** a program its page stops showing is flagged after 2 runs.
   - **Archived programs** are skipped.
   - Pages are only marked as seen once their results are imported, so a failed run is retried next time.

Programs with no published dates are listed with `schedule_notes` instead ("Held each November; 2027 dates to be announced"), which the site shows in place of dates.

### On a schedule (macOS)

`harvest/refresh.sh` runs the three steps, using `claude -p` for step 2 with only file edits, web fetches and the `harvest:` npm scripts pre-approved. It logs to `harvest/.cache/logs/`. To schedule it about every 3 days (days 1, 4, 7 … 28 at 07:17; a run missed while the Mac sleeps happens on wake):

```bash
bash harvest/install-mac.sh
```

Before installing, check these on the Mac:
- Node 20+ and Claude Code are installed, and you're signed in (run `claude` once).
- `web/.env.local` has `HARVEST_DATABASE_URL` (production's database URL, from Vercel → Storage → your Neon database; the harvest only writes hidden drafts and the safe changes above), `BLOB_READ_WRITE_TOKEN`, `RESEND_API_KEY` and `SUBMISSIONS_NOTIFY_TO`. `DATABASE_URL` can stay on the dev branch for local work.
- The repo isn't in Documents, Desktop or Downloads, which macOS blocks for scheduled jobs (or give `/bin/bash` Full Disk Access).

Run it now with `launchctl kickstart gui/$(id -u)/com.courttrips.refresh`; remove it with `bash harvest/install-mac.sh uninstall`.

### First harvest

Run it by region, so each Claude session stays small:

```bash
npm --prefix web run harvest:fetch -- --all --region Europe
claude "/harvest all Europe"
npm --prefix web run harvest:import -- --email
```

Then review the drafts in `/admin`.

## Post-deploy check

`.github/workflows/post-deploy-check.yml` runs `web/scripts/smoke.mjs` against every deployment Vercel finishes: key pages, every program page linked from search (so whatever is in that deployment's database), every photo, the `/go` hand-off, the 404 page, and that `/admin` is locked. Run it yourself with `npm run smoke -- https://courttrips.vercel.app`.

- Vercel starts it through a `repository_dispatch` event (Vercel → Settings → Git → repository_dispatch Events, on).
- Deployment URLs are protected by Vercel, so the check needs `VERCEL_AUTOMATION_BYPASS_SECRET` as a GitHub Actions secret (Vercel → Settings → Deployment Protection → Protection Bypass for Automation). Set.
- It reports back as **Vercel - courttrips: post-deploy-check**, which is a required Deployment Check (Vercel → Settings → Build and Deployment): a production deployment only goes live once it passes. If it fails, the previous version keeps serving.
