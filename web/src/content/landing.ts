// The written introduction of each landing page, by its address (src/lib/landing.ts decides which
// pages exist). Two or three sentences in plain words about what these trips are, for a visitor who
// arrived from a search.
//
// Keep them true whatever is listed this month: no counts, prices or dates (the page shows those live,
// under the introduction) and nothing that reads as first-hand experience. A page with no entry here
// shows its live facts alone.

export const INTROS: Record<string, string> = {
  "/tennis":
    "Coached tennis trips for adults: camps at the big academies, clinics you can fit into a weekend, and hotel-based holidays with coaching most days. Every trip shows its dates, price and playing level, and you book with the operator who runs it.",
  "/tennis/camps":
    "An adult tennis camp puts coaching first: several hours on court each day, usually in small groups set by level, at an academy or a resort with its own courts. They run from a weekend to a full week.",
  "/tennis/clinics":
    "Tennis clinics are short and focused: a morning, a day or a weekend on one part of your game, such as doubles tactics. Most need no overnight stay.",
  "/tennis/getaways":
    "A tennis holiday is time away with tennis built in: coaching most mornings, social play later in the day, and a hotel with courts on site. Most take a mix of levels.",

  "/pickleball":
    "Pickleball camps, clinics and vacations for adults, in the US and abroad. Camps are a few days of coaching; vacations and getaways pair a stay at a resort with daily play and pro-led clinics. Every trip shows its dates, price and level, and you book with the operator who runs it.",
  "/pickleball/camps":
    "A pickleball camp is two to four days of structured coaching: drills, strategy and supervised play, usually with a set number of players per coach. Many are grouped by rating, so check the level before you book.",
  "/pickleball/clinics":
    "Pickleball clinics are shorter, focused sessions led by a pro: a day or a few days on one area such as doubles strategy, sometimes as part of a resort stay.",
  "/pickleball/getaways":
    "A pickleball vacation combines a resort stay or a touring itinerary with play most days: clinics with the hosting pros, open play, and time off court. Each listing says what its price covers.",

  "/padel":
    "Coached padel trips for adults, from academy camps in Spain to clinics close to home and retreats further afield. Every trip shows its dates, price and playing level, and you book with the operator who runs it.",
  "/padel/camps":
    "A padel camp is several days of coaching at an academy or club: technique and tactics on court each day, in groups set by level.",
  "/padel/clinics":
    "Padel clinics are short, coached sessions, from a few hours to a weekend. They are a good way to start, or to work on one part of your game.",
  "/padel/getaways":
    "A padel holiday pairs a stay somewhere warm with coached sessions and social matches most days, and time off court as well.",

  "/padel/spain":
    "Spain is where padel is biggest, with more courts and players than any other country. Coached trips here are based at academies and clubs, and run from short camps to full weeks.",
  "/padel/united-kingdom":
    "Padel is growing quickly in the UK, and a coached clinic at a club is a quick way in. These are short sessions, with no flights or hotel to arrange.",
  "/padel/indonesia":
    "Coached padel retreats and camps in Indonesia, with sessions on court each day built around a longer stay.",

  "/pickleball/united-states":
    "Pickleball camps in the US are run by touring pros and coaching companies at clubs and resorts across the country. Most are two to four days, and many are grouped by rating.",
  "/pickleball/mexico":
    "Mexico is a popular choice for a pickleball vacation from the US and Canada: winter sun, and resorts with courts on site. Trips are usually about a week, with clinics and open play most days.",
  "/pickleball/spain":
    "Pickleball trips to Spain are touring holidays and resort retreats: play most days, with time for the cities and the coast in between.",
  "/pickleball/turks-and-caicos":
    "Pickleball vacations in Turks and Caicos are resort stays with clinics from the hosting pros and open play most days.",
  "/pickleball/dominican-republic":
    "Pickleball weeks in the Dominican Republic are resort stays, with clinics and open play each day.",
  "/pickleball/vietnam":
    "Pickleball trips to Vietnam mix play and clinics most days with time to see the country.",

  "/tennis/united-states":
    "Adult tennis camps in the US run at academies, ranches and resorts, from a weekend to a full week, with coaching in groups set by level.",
  "/tennis/spain":
    "Tennis trips in Spain range from camps at academies to hotel-based weeks with coaching most days.",
  "/tennis/greece":
    "Tennis holidays in Greece are hotel-based weeks by the sea, with coaching most mornings and social play later in the day.",
  "/tennis/united-kingdom":
    "Tennis clinics and weekends in the UK: short, coached sessions at clubs, with no flights to arrange.",
  "/tennis/france":
    "Adult tennis camps and clinics in France, from a weekend to a full week of coaching.",
};
