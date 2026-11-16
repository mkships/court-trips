# Court Trips: decisions and working notes

Claude Code reads this at the start of every session. The README explains how things work; this file
records what was decided and why, so later sessions don't re-open settled questions. Add to it when a
decision changes, and date the change.

## What Court Trips is

- A **directory** of adult tennis, pickleball and padel trips (camps, clinics, getaways) and the places
  that host them. It lists and links out; it never takes a booking or a payment. The player pays the
  operator. Live at https://courttrips.vercel.app (repo `mkships/court-trips`).
- On the site, say what that means for the player rather than using the label: "you book directly
  with the operators who run them". "Directory" is fine for operators and partners (/for-operators,
  /list-your-program).
- Even with affiliate commissions later it stays a directory, as Kayak stays metasearch: the booking
  happens on the other side.

## Words we use (settled Nov 2026)

| Term | Meaning | Examples |
|---|---|---|
| Operator | Runs the trip: sets dates, hires coaches, responsible on the day. Sells on its own site. | Active Away, Mouratoglou, Tyson McGuffin, a resort running its own weeks |
| Marketplace | Lists other people's trips and takes the booking or payment, usually for a commission | BookRetreats, Weebora; The Padel Circle behaves as one (its own enquiry form, hides the organiser) |
| Directory | Lists and links out, no booking | Court Trips, TennisTraveller, Pickleball Resort Guide |
| Booking software | Takes payment on the operator's behalf, behind the operator's own page | WeTravel, a Shopify or Squarespace checkout |
| Lead | An operator we know of but haven't listed yet | /admin/operators → Leads |

The test: where does the player pay? The operator → operator. The site in the middle → marketplace.
Signs of a marketplace: trips from many different organisers (names, ratings, "hosted by"), "List your
camp" / "Become a host", a deposit taken by the site or a lowest-price promise. "List your camp" alone
isn't proof (Court Trips has one; some operators have host-a-camp forms).

In the database, marketplaces and link-out directories share `organizations.kind = 'marketplace'`;
the admin tab is "Marketplaces & directories".

## Listing policy

- **Adults only.** Skip junior-only camps; family programs that include adults are fine.
- **Skip:** single lessons, memberships, open play, weekly club clinics, trips whose every date has
  passed, and one-off trips that are completely sold out.
- **Seasonal and one-off events are a feature**, not a gap: list them with `schedule_notes`
  ("Held each November; 2027 dates to be announced").
- **Marketplaces are never listed, featured or given a page.** A trip found on one is listed only when
  we know who runs it: the operator goes in `organizer`, and the link goes to the operator's own
  booking page. If the operator only books through the marketplace, the listing says "sold through"
  (`sold_through_id`). If the marketplace hides the organiser, the trip stays a lead.
- **No "featured camps by Weebora / The Padel Circle" collections.** They'd send our traffic to
  competitors for nothing. Revisit only with a commission or data-feed deal. Operator pages
  (/operators) are the collections we do.
- **Accuracy beats coverage:** only what the operator's page says; unknown stays empty. Listing
  descriptions are 1 to 3 plain sentences in British English, no marketing adjectives.
- **Photos:** courts, play, the venue, rooms. No logos, headshots or graphics with text on them, no
  junior group shots on adult listings, and no Getty or other stock images, because photos are
  re-hosted in our Blob storage.
- **Bot checks:** never work around one. Record the page as unread; the Mac refresh retries it with
  Claude's web tool, or someone adds the listing by hand.

## Harvest

- Mechanics are in the README (fetch → `/harvest` in Claude Code → check → import) and the rules for
  writing listings in `.claude/commands/harvest.md`.
- **No Anthropic API key**: the AI step runs in Claude Code on the owner's Mac, not through the API.
  The refresh is a local launchd job every 3 days (`harvest/install-mac.sh`), planned once the first
  harvest was imported; check with the owner whether it's installed.
- `HARVEST_DATABASE_URL` is production's database; `DATABASE_URL` stays on the Neon dev branch.
  Always dry-run an import first.
- **Regions:** Europe, North America, SE Asia, Maldives & Caribbean.
- **Balance:** North American pickleball was capped at about 35 programs for the first harvest
  (counting the US, Canada and Mexico; Caribbean and Central American trips count under their own
  region). Pickleball is huge in the US. Padel is skipped in North America (it's mostly a European
  sport) and is a strength in Europe and Bali.
- **First harvest, Nov 2026:** about 90 new drafts. Europe 21, North America 46, SE Asia 13,
  Maldives & Caribbean 9. The Maldives has no listings yet (only leads, e.g. COMO Maalifushi).
- **Leads** live in the database (`organizations.status = 'lead'`) with a note on what to check. The
  import saves the report's leads and turns a lead active when a listing names it.
- **Ideas noted, not done:** Active Away's 2027 calendar PDF as a better source (the fetch can't read
  PDFs); Casa de Campo as a Places to Stay entry; researching which marketplaces offer affiliate
  programmes; a map view.

## Owner preferences and how to work here

- The owner reviews on a phone or in a browser, often from the Claude app. Give commands as
  copy-paste blocks, one per command, and say what output to expect.
- Copy should be concise and on-brand, and UI should feel considered rather than generic. The owner
  gives detailed UI feedback from screenshots; fix what's asked and keep hover, focus and disabled
  states consistent (the shared rules in `web/src/lib/ui.ts`).
- **Open a PR only when asked; merge only when told.** Branch per piece of work. Full PR links, never
  a bare `#8`.
- Commits and PRs carry no model names. Never ask for secrets in chat: they go in Vercel or
  `web/.env.local`.
- Admin sign-in (GitHub OAuth, one account) works on production only, not on preview links; locally,
  `/admin/auth/dev` signs in during development.
- Deploys run the database migrations (`web/scripts/migrate.mjs` in the build); each preview gets
  its own Neon branch. Import pending harvest files before merging a migration that backfills them.

## Gotchas learned

- Drizzle leaves the table name off columns in a single-table select, so a `sql` subquery that
  refers to the outer row must name the table itself: `${organizations}.id`, not
  `${organizations.id}` (that read as the inner table's `id` and matched nothing).
- `unstable_cache` keeps a wrong result for an hour (and on disk in dev, under
  `.next/cache/fetch-cache`): clear it after fixing a query.
- Node's `fetch` can fail where `curl` works (connection resets through the proxy); `harvest:page
  --browser` handles pages that load their dates after opening.
