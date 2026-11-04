# Proposed sources for the first harvest

Pages the harvester would read to grow Court Trips from 27 to roughly 120 programs, plus places to stay. `sources.csv` is the same list in the form the harvester reads.

- **Est.** is how many adult programs I expect from that page, after removing past dates, junior camps and duplicates. It includes the ones already live.
- **Status:** `existing` is already in `target_urls.xlsx`; `new` is added here; `lead` needs the real operator found first; `drop` is removed, with the reason.
- **Target:** most rows give programs; `venue` rows give a place to stay (Places to stay on the site) instead.
- **Access:** `browser` means the site blocks plain requests or builds the page with JavaScript, so the harvester opens it in a headless browser.

## Expected mix

| Region | Tennis | Pickleball | Padel | Total |
|---|---:|---:|---:|---:|
| North America | 19 | 39 | 0 | 58 |
| Europe | 17 | 8 | 11 | 36 |
| SE Asia | 4 | 2 | 2 | 8 |
| Maldives & Caribbean | 4 | 11 | 2 | 16 |
| **All** | **44** | **60** | **15** | **118** |

## Where it's thin

- **North American pickleball is heavy (about 39).** I'd cap it at 25 for the first harvest, taking the soonest and most varied trips, so it doesn't swamp the rest.
- **Padel in North America: none.** The US and Canada have padel clubs with weekly classes, but I found no padel trips or camps. Mexico and the Caribbean are the nearest.
- **SE Asia is small (about 8).** The supply is mostly Mouratoglou in Bali and Malaysia and Rafa Nadal Academy's Thailand camp; Thanyapura in Phuket is listed as a place to stay. I found no pickleball trips in Vietnam or the Philippines, only local coaching sessions.
- **The Maldives runs on one-off events,** such as a visiting pro hosting a week, rather than repeating programs. Expect a few listings that need re-checking each season.
- **Many 2027 dates aren't published yet.** Seasonal pages, for example Neilson and Suncoast, will land as drafts flagged "no upcoming dates" until the operator publishes them.

## North America

| Operator | Where | Sport | Kind | Est. | Status | Notes |
|---|---|---|---|---:|---|---|
| [IMG Academy](https://www.imgacademy.com/adult-tennis-camp) | US (Florida) | Tennis | camp | 2 | new | 1-, 3- and 5-day adult camps |
| [John Newcombe Tennis Ranch](https://newktennis.com/adult-tennis/) | US (Texas) | Tennis | camp | 2 | new | adult weekend and week camps, all year |
| [Matchpoint International](https://www.matchpointinternational.com/) | Canada (Quebec) | Tennis | camp | 1 | new | Mont-Tremblant; check it's current |
| [Mouratoglou at Horseshoe Bay](https://www.hsbresort.com/mouratoglou-tennis-center/) | US (Texas) | Tennis | camp | 1 | new |  |
| [Niagara Academy of Tennis](https://www.niagaraacademyoftennis.com/) | Canada (Ontario) | Tennis | camp | 1 | new | adult 3-, 4- and 6-day programs |
| [Pickleball Cabo](https://www.wetravel.com/trips/self-guided-trips-january-2027-november-2027-pickleball-cabo-4242877983) | Mexico (Los Barriles) | Pickleball | getaway | 2 | new | sells through WeTravel; also a March 2027 tournament week |
| [Rafa Nadal Tennis Center Costa Mujeres](https://camps.rafanadalacademy.com/en/programs/adult-programs/) | Mexico (Costa Mujeres) | Tennis | camp | 2 | new | Caribbean coast; page builds with JavaScript (browser) |
| [Rancho La Puerta](https://rancholapuerta.com/pickleball-proweeks-2026/) | Mexico (Baja California) | Pickleball | getaway | 1 | new | pro weeks; bot check (browser) |
| [Saddlebrook Resort](https://www.saddlebrook.com/racquets/) | US (Florida) | Tennis | camp, clinic | 2 | new |  |
| [Van der Meer Tennis](https://vandermeertennis.com/adult-tennis-clinics/) | US (South Carolina, Virginia) | Tennis | clinic, camp | 3 | new | Hilton Head clinics; Sweet Briar camps |
| [Better Pickleball](https://betterpickleball.com/camp-locations/) | US | Pickleball | camp | 3 | existing |  |
| [Cape Columbia Pickleball](https://www.capecolumbiapickleball.com/collections/indoor-pickleball-camps) | US | Pickleball | camp | 1 | existing |  |
| [Elite Pickleball Retreats](https://www.elitepickleballretreats.com/trip) | US | Pickleball | getaway | 2 | existing |  |
| [Empowher Pickleball](https://empowherpickleball.com/empowhercamps) | US | Pickleball | camp | 1 | existing |  |
| [Engage Pickleball](https://engagepickleball.com/collections/all-training-camps) | US | Pickleball | camp | 1 | existing | 1 already live |
| [Level Up Pickleball Camps](https://www.leveluppickleballcamps.com/by-state) | US | Pickleball | camp | 3 | existing |  |
| [Mark Price Pickleball](https://www.markpricepickleball.com/pickleball-coaching/pickleball-vacations) | US | Pickleball | getaway | 1 | existing |  |
| [Mark Price Pickleball](https://www.markpricepickleball.com/store/pickleball-camps) | US | Pickleball | camp | 1 | existing | 1 already live |
| [Mouratoglou at TTR Templeton](https://www.ttrtennis.com/tennis/mouratoglou-high-performance-camps/) | US | Tennis | camp | 1 | existing | 1 already live |
| [Nike Pickleball Camps (US Sports Camps)](https://www.ussportscamps.com/search/results?live=1&sportSlug=pickleball) | US | Pickleball | camp | 3 | existing | 1 already live (browser) |
| [Nike Tennis Camps (US Sports Camps)](https://www.ussportscamps.com/search/results?live=1&sportSlug=tennis) | US | Tennis | camp | 3 | existing | adult camps only; 1 already live (browser) |
| [Pickleball Cruises](https://pickleballcruises.com/) | Cruise | Pickleball | getaway | 1 | lead | HTTPS certificate expired when checked on 4 Nov 2026: check the site is still running |
| [Pickleball Getaways](https://pickleballgetaways.com/getaways/) | US | Pickleball | getaway | 3 | existing | 1 already live (Club Med Turkoise) |
| [Pickleball Trips](https://pickleballtrips.com/trips/) | US | Pickleball | getaway | 2 | existing |  |
| [PickleballTrips.net](https://pickleballtrips.net/upcoming) | US | Pickleball | getaway | 2 | existing |  |
| [Rise Pickleball](https://www.risepickleball.com/camps) | US | Pickleball | camp, clinic | 2 | existing |  |
| [Road Scholar](https://www.roadscholar.org/collections/pickleball/) | US / worldwide | Pickleball | getaway, camp | 2 | existing |  |
| [Suncoast Pickleball](https://suncoastpickleball.com/camps-2026/) | US | Pickleball | camp | 1 | existing | page is 2026; look for 2027 |
| [TTR Tennis (Templeton)](https://www.ttrtennis.com/tennis/instruction/adult-tennis-clinics-and-lessons/) | US | Tennis | clinic | 1 | existing |  |
| [Taylored Pickleball Academy](https://www.tayloredpickleballacademy.ca/camps) | Canada | Pickleball | camp | 1 | existing |  |
| [Taylored Pickleball Academy](https://www.tayloredpickleballacademy.ca/clinics) | Canada | Pickleball | clinic | 1 | existing |  |
| [Taylored Pickleball Academy](https://www.tayloredpickleballacademy.ca/vacations) | Canada / abroad | Pickleball | getaway | 1 | existing |  |
| [Tyson McGuffin](https://tysonmcguffin.com/pages/all-camps) | US | Pickleball | camp, clinic | 2 | existing | 1 already live |
| [US Pickleball Camps](https://uspickleballcamps.com/locations) | US | Pickleball | camp | 2 | existing |  |

## Europe

| Operator | Where | Sport | Kind | Est. | Status | Notes |
|---|---|---|---|---:|---|---|
| [Croft Academy at Pine Cliffs](https://www.pinecliffs.com/en/golf-sports/tennis/) | Portugal (Algarve) | Tennis, Padel | clinic | 2 | new | weekly adult tennis and padel courses |
| [Mark Warner](https://www.markwarner.co.uk/activity-holidays/intensive-tennis-weeks/) | Greece / Turkey | Tennis | getaway | 2 | new |  |
| [Mark Warner](https://www.markwarner.co.uk/activity-holidays/tennis-and-padel/padel/) | Greece | Padel | getaway | 1 | new |  |
| [Mark Warner](https://www.markwarner.co.uk/activity-holidays/tennis-and-padel/pickleball/) | Turkey / Greece | Pickleball | getaway | 1 | new |  |
| [Mickle Pickleball Trips](https://micklepickleballtrips.com/) | Spain / Italy / Croatia | Pickleball | getaway | 3 | new | 10-day guided trips |
| [Mouratoglou Academy](https://www.mouratoglou.com/en/types/adults/) | France (Biot) | Tennis | camp, clinic | 3 | new | weekend, morning week, intensive week, competition week |
| [Neilson](https://www.neilson.co.uk/beach/activities/tennis-holidays) | Greece / Turkey / Croatia | Tennis | getaway | 2 | new | 2026 dates 'to be confirmed' when checked |
| [O-Sports](https://www.o-sports.pt/en/training-camps/pickleball-training-camps) | Portugal | Pickleball | camp | 1 | new |  |
| [Rafa Nadal Academy](https://www.rafanadalacademy.com/en/adult-camps/tennis-camps/) | Spain (Mallorca) | Tennis | camp | 2 | new | premium week, holiday-period camps |
| [Rafa Nadal Academy](https://www.rafanadalacademy.com/en/adult-camps/padel-camps/) | Spain (Mallorca) | Padel | camp | 1 | new | 1 already live; adds weekly premium / Easter |
| [Spain Padel Experiences](https://www.spainpadelexperiences.com/mallorca-padel-camps) | Spain (Mallorca) | Padel | camp | 1 | new | bot check on plain requests (browser) |
| [TCCB](https://www.tccb.ch/en/adult-camps) | Switzerland | Tennis | camp | 1 | new |  |
| [The Padel School](https://thepadelschool.com/events) | Spain / Portugal / Italy | Padel | getaway | 2 | new | events page redirects; find the current holidays page (browser) |
| [iPadel](https://ipadel.co.uk/Padel-Holidays) | Spain (Mallorca) / Portugal | Padel | getaway | 3 | new |  |
| [Active Away](https://activeaway.com/venues?types=pickleball-holiday) | Portugal / Spain | Pickleball | getaway | 2 | existing | 1 already live |
| [Active Away](https://activeaway.com/venues?types=tennis-clinic) | UK | Tennis | clinic | 2 | existing | 2 already live; dates shown a day early |
| [Active Away](https://activeaway.com/venues?types=tennis-holiday) | Greece / Portugal / Spain | Tennis | getaway | 2 | existing |  |
| [Active Away](https://activeaway.com/venues?types=padel-tennis-holiday) | Portugal / Spain | Padel | getaway | 2 | existing | 4 already live |
| [Active Away (junior camps)](https://activeaway.com/venues?types=junior-tennis-camp) | UK | Tennis | camp | 0 | drop | junior-only; Court Trips lists adult trips |
| [JSL Events](https://www.jsl-events.de/reisen/) | Germany / Europe | Tennis | camp, getaway | 2 | lead | Page gone (404) when checked on 4 Nov 2026: find their current trips page |
| [Pickleball in Paradise](https://pickleballinparadise.com/trips/?_sft_trip_type=river-cruise-2) | Europe (river cruise) | Pickleball | getaway, clinic | 1 | existing |  |
| [Tennis Traveller (directory)](https://www.tennistraveller.net/en/tennis-camps/looking-for-tennis-camps?limit=72&cc=p) | Europe | Tennis, Padel | camp, clinic, getaway | 0 | drop | a booking directory, not an operator: use it to find operators, then list them directly |
| [Tennis Traveller (directory)](https://www.tennistraveller.net/en/tennis-camps/looking-for-tennis-camps?cc=p&start=72) | Europe | Tennis, Padel | camp, clinic, getaway | 0 | drop | a booking directory, not an operator: use it to find operators, then list them directly |
| [Tennis Traveller (directory)](https://www.tennistraveller.net/en/tennis-camps/looking-for-tennis-camps?cc=p&start=96) | Europe | Tennis, Padel | camp, clinic, getaway | 0 | drop | a booking directory, not an operator: use it to find operators, then list them directly |

## SE Asia

| Operator | Where | Sport | Kind | Est. | Status | Notes |
|---|---|---|---|---:|---|---|
| [Goddess Retreats (Padel Goddess)](https://www.goddessretreats.com/) | Indonesia (Bali) | Padel | getaway | 1 | new | women-only padel and wellness retreat |
| [Mouratoglou Academy Malaysia](https://www.mouratoglou.epsomcollege.edu.my/adultcamps) | Malaysia | Tennis | camp | 2 | new | weekend intensive, full week |
| [Mouratoglou Tennis Center Bali](https://www.mouratoglou.com/en/international/bali/tennis-lessons/) | Indonesia (Bali) | Tennis, Padel, Pickleball | getaway | 3 | new | custom retreats at the Westin Ubud; prices on request |
| [Rafa Nadal Academy camps](https://camps.rafanadalacademy.com/en/programs/thailand/) | Thailand | Tennis | camp | 1 | new | adult camp; 2026 dates passed, watch for 2027 (browser) |
| [Thanyapura](https://www.thanyapura-phuket.com/) | Thailand (Phuket) | Tennis | place to stay | – | new | Listed under Places to stay, not as a program: a sports resort with its own tennis centre (browser) |
| [10-day Bali pickleball retreat](https://bookretreats.com/r/10-day-pickleball-retreat-in-paradise-bali-indonesia) | Indonesia (Bali) | Pickleball | getaway | 1 | lead | found on BookRetreats: find the organiser and list them directly |

## Maldives & Caribbean

| Operator | Where | Sport | Kind | Est. | Status | Notes |
|---|---|---|---|---:|---|---|
| [Aurora Anguilla](https://www.auroraanguilla.com/pickleball-trips/) | Anguilla | Pickleball | getaway | 2 | new |  |
| [Casa de Campo](https://www.casadecampo.com.do/experiences/racquet-center/) | Dominican Republic | Tennis, Pickleball, Padel | clinic | 2 | new |  |
| [Club Med](https://www.clubmed.us/l/pickleball-all-inclusive-vacations-club-med) | Mexico / Dominican Republic | Pickleball | clinic | 2 | new | daily clinics at Cancún, Ixtapa, Punta Cana |
| [Curtain Bluff](https://curtainbluff.com/tennis/) | Antigua | Tennis | getaway | 2 | new | Tennis Challenge Week (Nov), Antigua Tennis Week (spring) |
| [Four Seasons Kuda Huraa](https://www.fourseasons.com/maldiveskh/services-and-amenities/tennis/) | Maldives | Tennis | clinic | 1 | new | tennis academy with visiting pros; blocks plain requests (browser) |
| [Kuredu Island Resort](https://www.kuredu.com/activities/#tennis--padel) | Maldives | Padel | getaway | 1 | new | Padel Tennis Week; check for dates |
| [PPA Pickleball Vacations](https://www.ppatour.com/vacations/) | Turks & Caicos / Dominican Republic / St Lucia / Mexico | Pickleball | getaway | 3 | new | pro-led weeks at Club Med and other resorts |
| [Empowher Pickleball](https://empowherpickleball.com/empowherretreats) | Dominican Republic / US | Pickleball | getaway | 1 | existing | 1 already live (Punta Cana) |
| [Pickleball in Paradise](https://pickleballinparadise.com/trips/?_sft_trip_type=clinic) | St Lucia / various | Pickleball | clinic | 2 | existing | 1 already live (La Toc) |
