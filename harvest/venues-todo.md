# Draft venues still to fill in

As of 16 November 2026. Linking trips to venues created 59 draft venues (hidden, in `/admin` → Venues). A harvest pass filled 28 of them from the venues' own sites. This file lists what is left.

Tick a line off when the venue is filled in and published, or archived.

## Filled, but short of photos

These have their facts and courts but few usable photos (the import refuses images under 600px wide). Add photos in the venue editor before publishing.

- [ ] St George's Hill Lawn Tennis Club: 0 photos
- [ ] Aphrodite Hills Resort: 1
- [ ] Horseshoe Bay Resort: 2
- [ ] Iberostar Selection Rose Hall Suites: 2
- [ ] M3 Padel Academy: 2
- [ ] Mouratoglou Academy: 2
- [ ] Rancho La Puerta: 2

For the other 21 filled venues the photos were picked by rule (the first six non-logo images on the page), not by eye. Look at each cover before publishing. The two Mark Warner resorts (Paleros, Phokaia) share a generic gallery and are the likeliest to be wrong.

Facts worth a second look:

- Mouratoglou Academy is entered as 25 outdoor and 8 covered courts. The page says 33 in total with 8 covered; 25 is a subtraction.
- Daryl Collins shows 8 pickleball courts from the club's own site. Pickleball Pro Retreats says 10.
- Court rows with no count, because the page names the courts without numbering them: The Lensbury, St George's Hill, Liberty Lykia, Rancho La Puerta, Aurora Anguilla, Iberostar Rose Hall, Epsom College, Advantage Padel Nottingham.

## Not filled: 31

### The site blocks automated reading (6)

The fallback browser isn't installed on the machine the harvest ran on. Run `npx playwright install chromium` in `web/`, then re-run `/harvest fill in the draft venues`.

- [ ] Sandals Regency La Toc: https://www.sandals.com/regency-la-toc/
- [ ] Sandals Royal Bahamian: https://www.sandals.com/royal-bahamian/
- [ ] Sandals Royal Curaçao: https://www.sandals.com/royal-curacao/
- [ ] Sandals South Coast: https://www.sandals.com/south-coast/
- [ ] Beaches Turks and Caicos: https://www.beaches.com/resorts/turks-caicos/
- [ ] Club Med Marbella (Club Med Magna Marbella): https://www.clubmed.co.uk/r/magna-marbella/y

These addresses are guesses that were blocked before the page could be seen, so confirm each one opens. Engage Pickleball's Sandals Royal Bahamian product page now redirects to their home page; check that trip still runs.

### Website not found or not working (9)

Find the right address by hand. What is known from the trip pages is noted.

- [ ] Ikos Kissamos: ikosresorts.com blocks reading. Active Away says four floodlit artificial clay tennis courts, three outdoor padel courts, eight pools, six à la carte restaurants.
- [ ] Nana Golden Beach: nanagoldenbeach.com has a certificate error. Active Away says five-star, six outdoor padel courts.
- [ ] Tomaz Pickleball Club: tomazpickleball.com has a certificate error. Pickleball Pro Retreats says 20 air-conditioned pickleball courts, a restaurant and a pro shop.
- [ ] Fergus Club Font de Sa Cala Beach: the fergushotels.com address tried was a 404. Active Away says four-star, 11 clay courts.
- [ ] Grand Palladium Palace Resort Spa & Casino: the palladiumhotelgroup.com addresses tried were 404s.
- [ ] Hove Beach Park: no site found at hovebeachpark.co.uk or .com.
- [ ] Great Western Golf (Game4Padel), Glasgow: the game4padel.co.uk page returned nothing readable. Active Away says three covered, floodlit artificial-grass padel courts.
- [ ] Tennis Club Alba: the Pickleball Pro Retreats page for Alba came back almost empty; no venue site found.
- [ ] Invictus, Uvita: no website found. Taylored Pickleball Academy says four covered, lit pickleball courts, a courtside plunge pool and bar, a shared pool and a yoga platform. "Invictus" alone is too vague a name for a venue page; find what the place calls itself.

### Site read, but the page had no venue facts (13)

The home page or trip page says nothing about how many courts there are. Each needs its facilities page found by hand.

- [ ] Rafa Nadal Academy: https://www.rafanadalacademy.com/en/ (has rooms, a spa and three restaurants; court numbers not on the pages read)
- [ ] Rafa Nadal Tennis Center Costa Mujeres
- [ ] IMG Academy: https://www.imgacademy.com/
- [ ] John Newcombe Tennis Ranch: https://newktennis.com/
- [ ] Emilio Sánchez Academy: https://emiliosanchezacademy.com/barcelona
- [ ] PicklePlex: https://www.pickleplex.org/
- [ ] TTC Palms: https://ttcpalms.com/ (the page is nearly empty)
- [ ] Taube Pavilion, Arrillaga Tennis Center (Stanford)
- [ ] Montreat Conference Center
- [ ] Paradise Pickleball, Palm Desert
- [ ] Picklr Rancho Santa Margarita
- [ ] The Courts McKinney
- [ ] Rancho Santana: https://ranchosantana.com/

### Probably archive instead of filling (2)

Hotels with no courts of their own; the trips play somewhere else. A venue page here would mislead.

- [ ] AC Hotel Victoria Suites by Marriott, Barcelona: the padel is at Club Esportiu Laietà, about 20 minutes away. Consider making Club Esportiu Laietà the venue instead.
- [ ] Palmas de Cortez, Los Barriles: the pickleball is at a separate venue, probably Palmas Pickleball Resort (already filled). Check whether the two trips that name this hotel should link to that resort.

### Suspicious website (1)

- [ ] Tilajari Hotel Resort: tilajari.com links out to casino and unrelated sites, so it may not be the hotel's any more. Pickleball Getaways says the resort has a pool, a jacuzzi, tennis courts and a gym; their pickleball courts there are temporary.

## One trip with no venue

- [ ] `empowher-womens-camp-orange-park` names "The Hub", which is too short a name to match automatically. Create the venue by hand in admin if it should have one.

## How to continue

- To have the harvest fill more: fix what blocks it (above), then `/harvest fill in the draft venues`, `npm --prefix web run harvest:check`, and `npm --prefix web run harvest:import -- --dry-run` before the real import. The import fills a draft completely only while it is still an untouched placeholder (no website, no description, no courts, no photos).
- To fill one by hand: open it in `/admin` → Venues. Set the kind (placeholders say "club"), website, description, courts, what's on site and photos, then Save and publish.
