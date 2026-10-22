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
python3 scripts/seed.py   # downloads operator photos and builds src/data/seed.json
npm run dev
```

Operator photos are downloaded locally and not committed; get permission before publishing them.
