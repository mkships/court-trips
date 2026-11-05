---
description: Read the source pages harvest:fetch saved and write one listing file per program for harvest:import
argument-hint: "[changed | all] [region or operator filter]"
---

# Harvest Court Trips listings

You're filling in Court Trips listings from operators' own websites. Court Trips is a directory of **adult** tennis, pickleball and padel camps, clinics and getaways. It links out to the operator; it never takes bookings. Accuracy beats coverage: a listing with fewer fields that are all true is worth more than a full one with guesses.

Arguments: `$ARGUMENTS`. With no arguments, or `changed`, work through the pages `harvest:fetch` marked `new`, `changed` or `blocked`. With `all`, work through every page in the plan. A region (`Europe`, `North America`, `SE Asia`, `Maldives & Caribbean`) or an operator name narrows that further.

## Inputs

- `harvest/.cache/run.json`: the plan from `harvest:fetch`. Each page has `url`, `target` (`programs`, or `venue` for a place to stay), `kind` (`source` for a page in `harvest/sources.csv`, `program` for a program's own page), `change`, `file` (the page text, relative to `harvest/.cache/`), and for sources the `region`, `sports`, `category`, `operator`, `est_programs` and `note` columns of `sources.csv`.
- The page text: plain text with links written as `[text](url)` and photos as `[image: url]`. `[cover: url]` is the page's sharing image.
- To read a program's own page (a link from a source page), run `npm --prefix web run harvest:page -- <url>`. If the dates or prices are missing from what it prints (some sites, Active Away among them, load them after the page opens), run it again with `--browser` at the end. For a page marked `blocked`, try your web fetch tool. If that fails too, record the page as unreadable in the report and move on. Don't guess its contents.
- `directory-schema.json` (repo root) defines every field. `seed/programs.json` has 27 finished examples; match their style.

## What to write

One JSON file per program in `harvest/out/<slug>.json`, in the same shape as an entry of `seed/programs.json`: `meta`, `core_identity`, `categorization`, `rating_systems`, `location`, `sessions`, `schedule_notes`, `pricing`, `sport_specific`, `media`. Then write `harvest/out/_report.json` (format below).

- **One program = one product with its own dates and price.** Several dates of the same product are `sessions` of one program, not separate programs. The same product at two venues is two programs.
- **`core_identity.organizer`** is who runs the program, spelled the way they write it; the import links it to that operator's record (by name or a known other spelling) or adds a new one. `core_identity.sold_through` stays null unless a marketplace is the only way to book.
- **`meta`:**
  - `slug`: lowercase-hyphenated and descriptive, e.g. `mark-warner-intensive-tennis-week-phokaia`.
  - `source_url`: the program's own page; the source page if it has none.
  - `listing_url`: the `sources.csv` page you found it on.
  - `scraped_at`: today's date.
  - `needs_review`: `true`.
  - `data_quality_score`: 0 to 1, your confidence that everything you wrote is on the page.
- **Only what the page says.** Don't fill gaps from general knowledge. Unknown is `null`, or `[]` for lists. The exceptions:
  - `location.lat` / `lng`: give the venue's or town's coordinates when you know them confidently (4 decimal places is plenty).
  - `languages`: `["English"]` for an English-language operator page.
- **Dates:**
  - `sessions` hold only dates that haven't started yet (today or later), with `start_date` and `end_date` as `YYYY-MM-DD`. Include `booking_url` when a date has its own booking link, and `price_override` when a date has its own price.
  - Prefer the dates in a booking link over the dates in a listing's text when they disagree (Active Away's listing pages show every date a day early), and say so in `pricing.price_notes`.
- **No dates published:** that's normal, not a reason to skip a program. Recurring and one-off events (a pro's visiting week, a tennis week every November, a season that hasn't opened yet) are worth listing. Leave `sessions` empty and write `schedule_notes` as a short, specific line a player can act on, for example:
  - "Held each November; 2027 dates to be announced."
  - "Weekly, Sunday to Sunday, May to October."
  - "Runs on request for groups of 4 to 8."
  - "Summer 2027 dates to be announced; 2026 ran in July."
- **Prices:**
  - `price_min` / `price_max` are numbers in `currency` (ISO code).
  - `price_unit` is `per_person`, `per_person_sharing` or null.
  - Write add-on prices plainly in `price_notes` ("£395pp on top of a Mark Warner holiday").
- **Values from the schema's option lists only:**
  - `category`: `camp`, `clinic` or `social_getaway`.
  - `level`: `beginner`, `intermediate`, `advanced`, `all levels`.
  - `racket_sport`: `tennis`, `pickleball`, `padel`.
  - `accommodation_type`: `on_site_resort`, `partner_hotel`, `villa`, `self_arranged`, `not_included`.
  - `court_surface`: `Hard`, `Clay`, `Grass`, `Artificial Turf`, `Carpet`.
- **Words:**
  - `title` names the product, not the operator's brand slogan: "Intensive tennis week at Phokaia Beach Resort".
  - `description` is 1 to 3 plain sentences from the page's facts, in British English, with no marketing adjectives.
  - `inclusions` are short lowercase phrases ("20 hours coaching", "breakfast").
- **`media.images`:** up to 6 photo URLs from the program's page, best first. Use photos of courts, play, the venue and rooms. Skip logos, icons, maps and people's headshots. `media.thumbnail` is the first one.

## Places to stay

A page whose `target` in `run.json` is `venue` is a place to stay (a resort or hotel with courts), not a program. For it, write `harvest/out/venues/<slug>.json` in the shape of an entry of `seed/venues.json`: `meta`, `core_identity` (`name`, `kind`, `stars`, `adults_only`, `description`, `website`), `location`, `facilities` (`racket_sport`, `courts[]` with `sport`, `count`, `surface` and `indoor`, and `amenities`), `pricing.price_notes` and `media.images`.

- `kind` is `resort`, `hotel`, `club` or `academy`.
- Don't write its packages as programs. Still list the venue's slug under that page's `programs` in the report.

## What to leave out

- **Junior-only programs.** Family programs that include adults are fine.
- **Single lessons, memberships, open play** and anything that isn't a camp, clinic or getaway.
- **Programs whose every date has passed** with no sign they run again.
- **Marketplaces and directories themselves** (BookRetreats, Weebora, The Padel Circle, TennisTraveller): never list the site, and never put it in `organizer`. A camp you find on one is listed only when you know who runs it:
  - The operator goes in `organizer`, and `booking_url` is the operator's own booking page if they have one.
  - If the operator takes bookings only through the marketplace, set `core_identity.sold_through` to the marketplace's name.
  - If the page doesn't say who runs it, don't list it: add it to the report's `leads`, named as the operator calls itself, with the marketplace page as `url`. The import keeps leads in /admin → Operators → Leads.
- **Telling them apart:** a marketplace or directory shows camps from many different organisers (their names, ratings, "hosted by"), invites organisers to list ("List your camp", "Become a host"), and often takes a deposit or promises the lowest price. An operator's site shows only its own camps, coaches and dates. Booking software on an operator's own site (WeTravel, Shopify, a Squarespace shop) doesn't make it a marketplace, and neither does a form for clubs to host the operator's camps.
- **Archived programs:** before writing a file, check the slug isn't archived (run `npm --prefix web run harvest:archived`). Archived ones were rejected or retired on purpose.

## Balance (first harvest)

Keep **North American pickleball to about 35 programs** in total, counting the ones already live. When a source has more than its `est_programs`, prefer the soonest dates, different places, and different kinds (camp, clinic, getaway) over many near-identical sessions. Every other region and sport: take all that qualify.

## Report

`harvest/out/_report.json`:

```json
{
  "finishedAt": "2027-01-10T09:30:00Z",
  "pages": [
    { "url": "<page from run.json>", "read": true, "programs": ["slug-a", "slug-b"], "note": "2 programs; 3 junior camps skipped" },
    { "url": "<blocked page>", "read": false, "programs": [], "note": "bot check, web fetch also refused" }
  ],
  "leads": [{ "operator": "Name", "url": "https://…", "note": "found via a directory; looks like a good source" }]
}
```

List every page you were given, read or not. `programs` must name every program you found on that page, including ones that already exist and haven't changed. That's how the import knows a program has disappeared.

## Finish

Run `npm --prefix web run harvest:check`. It validates every file in `harvest/out/` against the schema rules and prints problems. Fix what it reports, and re-run it until it's clean. Don't run the import yourself. End with a one-paragraph summary: pages read, programs written, and anything a person should look at.
