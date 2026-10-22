# Seed data

A small, hand-checked set of listings to build the site against: 27 programs (three per sport and category) and 6 venues. Every value was read off the live operator page on 22 October 2026. `meta.source_url` is the page it came from.

| | Camp | Clinic | Getaway |
|---|---|---|---|
| Tennis | Zanzanù (Lake Garda), Nike at Stanford, Mouratoglou at Templeton | St George's Hill grass, David Lloyd Finchley, Brighton tennis + padel | Ikos Kissamos, Sani Beach, The Lensbury |
| Pickleball | Engage (Oxford, FL), Mark Price (Acworth, GA), Nike at TTC Palms | Tyson McGuffin Doubles Lab, Los Barriles festival, Pickleball in Paradise at La Toc | Club Med Turkoise, Empowher Punta Cana, Vilamoura |
| Padel | Rafa Nadal Academy, M3 Madrid, Emilio Sánchez | Premier Padel Finals (Barcelona), Nottingham, Glasgow | Barcelona, Vilamoura, Nana Golden Beach |

Venues: Sani Resort, Parkhotel Marlena, Park Hotel Zanzanù, Club Med Turkoise, Hyatt Regency Vilamoura, MOHR life resort.

## Shape

Both files follow `directory-schema.json` v2.2 group by group:

- `programs.json` follows `retreat_schema`. `pricing.price_unit` says what the price buys: `per_person` or `per_person_sharing` (double occupancy). `location.venue_slug` links a program to a venue. `schedule_notes` sits at the top level, next to the `sessions` array.
- `venues.json` follows `venue_schema`: `core_identity` (name, kind, stars, adults only), `location`, `facilities` (sports, `courts[]`, amenities), `pricing.price_notes`, `relations.program_slugs` (derived from the programs) and `media`.

`media.images` holds the operators' full-size image URLs. `web/scripts/seed.py` downloads them for the site. The photos belong to the operators, so get permission before anything goes public.

## Things to know

- **Active Away pages show dates a day early.** Every date on the listing page is one day before the date in its booking link (for example "Fri 09 Jul" for a Saturday 10 July clinic). The seed uses the booking-link dates. The earlier harvest has the same problem.
- **No photos** for Mouratoglou/Templeton, Engage, and both Tyson McGuffin events. Those operators only publish logos or text graphics.
- **Zanzanù's 2026 season has ended**, so it has seasonal `schedule_notes` instead of sessions.
- **Rafa Nadal Academy's price** (€960 a week) comes from The Padel Circle, a padel camp directory. The academy itself quotes on request.
