import type { COUNTRIES } from "@/lib/countries";

// Each country's ISO 3166-1 code (its flag is served at /flags/<code>.svg) and its continent.
// Keyed by the names in src/lib/countries.ts; a name added there without a code here fails the type check.

type Country = (typeof COUNTRIES)[number];

// prettier-ignore
const CODES: Record<Country, string> = {
  "Afghanistan": "AF", "Åland Islands": "AX", "Albania": "AL", "Algeria": "DZ", "American Samoa": "AS",
  "Andorra": "AD", "Angola": "AO", "Anguilla": "AI", "Antarctica": "AQ", "Antigua and Barbuda": "AG",
  "Argentina": "AR", "Armenia": "AM", "Aruba": "AW", "Australia": "AU", "Austria": "AT", "Azerbaijan": "AZ",
  "Bahamas": "BS", "Bahrain": "BH", "Bangladesh": "BD", "Barbados": "BB", "Belarus": "BY", "Belgium": "BE",
  "Belize": "BZ", "Benin": "BJ", "Bermuda": "BM", "Bhutan": "BT", "Bolivia": "BO", "Bosnia and Herzegovina": "BA",
  "Botswana": "BW", "Bouvet Island": "BV", "Brazil": "BR", "British Indian Ocean Territory": "IO",
  "British Virgin Islands": "VG", "Brunei": "BN", "Bulgaria": "BG", "Burkina Faso": "BF", "Burundi": "BI",
  "Cambodia": "KH", "Cameroon": "CM", "Canada": "CA", "Cape Verde": "CV", "Caribbean Netherlands": "BQ",
  "Cayman Islands": "KY", "Central African Republic": "CF", "Chad": "TD", "Chile": "CL", "China": "CN",
  "Christmas Island": "CX", "Cocos (Keeling) Islands": "CC", "Colombia": "CO", "Comoros": "KM", "Cook Islands": "CK",
  "Costa Rica": "CR", "Côte d'Ivoire": "CI", "Croatia": "HR", "Cuba": "CU", "Curaçao": "CW", "Cyprus": "CY",
  "Czechia": "CZ", "Democratic Republic of the Congo": "CD", "Denmark": "DK", "Djibouti": "DJ", "Dominica": "DM",
  "Dominican Republic": "DO", "Ecuador": "EC", "Egypt": "EG", "El Salvador": "SV", "Equatorial Guinea": "GQ",
  "Eritrea": "ER", "Estonia": "EE", "Eswatini": "SZ", "Ethiopia": "ET", "Falkland Islands": "FK",
  "Faroe Islands": "FO", "Fiji": "FJ", "Finland": "FI", "France": "FR", "French Guiana": "GF",
  "French Polynesia": "PF", "French Southern Territories": "TF", "Gabon": "GA", "Gambia": "GM", "Georgia": "GE",
  "Germany": "DE", "Ghana": "GH", "Gibraltar": "GI", "Greece": "GR", "Greenland": "GL", "Grenada": "GD",
  "Guadeloupe": "GP", "Guam": "GU", "Guatemala": "GT", "Guernsey": "GG", "Guinea": "GN", "Guinea-Bissau": "GW",
  "Guyana": "GY", "Haiti": "HT", "Heard and McDonald Islands": "HM", "Honduras": "HN", "Hong Kong": "HK",
  "Hungary": "HU", "Iceland": "IS", "India": "IN", "Indonesia": "ID", "Iran": "IR", "Iraq": "IQ", "Ireland": "IE",
  "Isle of Man": "IM", "Israel": "IL", "Italy": "IT", "Jamaica": "JM", "Japan": "JP", "Jersey": "JE", "Jordan": "JO",
  "Kazakhstan": "KZ", "Kenya": "KE", "Kiribati": "KI", "Kuwait": "KW", "Kyrgyzstan": "KG", "Laos": "LA",
  "Latvia": "LV", "Lebanon": "LB", "Lesotho": "LS", "Liberia": "LR", "Libya": "LY", "Liechtenstein": "LI",
  "Lithuania": "LT", "Luxembourg": "LU", "Macao": "MO", "Madagascar": "MG", "Malawi": "MW", "Malaysia": "MY",
  "Maldives": "MV", "Mali": "ML", "Malta": "MT", "Marshall Islands": "MH", "Martinique": "MQ", "Mauritania": "MR",
  "Mauritius": "MU", "Mayotte": "YT", "Mexico": "MX", "Micronesia": "FM", "Moldova": "MD", "Monaco": "MC",
  "Mongolia": "MN", "Montenegro": "ME", "Montserrat": "MS", "Morocco": "MA", "Mozambique": "MZ", "Myanmar": "MM",
  "Namibia": "NA", "Nauru": "NR", "Nepal": "NP", "Netherlands": "NL", "New Caledonia": "NC", "New Zealand": "NZ",
  "Nicaragua": "NI", "Niger": "NE", "Nigeria": "NG", "Niue": "NU", "Norfolk Island": "NF", "North Korea": "KP",
  "North Macedonia": "MK", "Northern Mariana Islands": "MP", "Norway": "NO", "Oman": "OM", "Pakistan": "PK",
  "Palau": "PW", "Palestine": "PS", "Panama": "PA", "Papua New Guinea": "PG", "Paraguay": "PY", "Peru": "PE",
  "Philippines": "PH", "Pitcairn Islands": "PN", "Poland": "PL", "Portugal": "PT", "Puerto Rico": "PR",
  "Qatar": "QA", "Republic of the Congo": "CG", "Réunion": "RE", "Romania": "RO", "Russia": "RU", "Rwanda": "RW",
  "Saint Barthélemy": "BL", "Saint Helena": "SH", "Saint Kitts and Nevis": "KN", "Saint Lucia": "LC",
  "Saint Martin": "MF", "Saint Pierre and Miquelon": "PM", "Saint Vincent and Grenadines": "VC", "Samoa": "WS",
  "San Marino": "SM", "São Tomé and Príncipe": "ST", "Saudi Arabia": "SA", "Senegal": "SN", "Serbia": "RS",
  "Seychelles": "SC", "Sierra Leone": "SL", "Singapore": "SG", "Sint Maarten": "SX", "Slovakia": "SK",
  "Slovenia": "SI", "Solomon Islands": "SB", "Somalia": "SO", "South Africa": "ZA",
  "South Georgia and South Sandwich Islands": "GS", "South Korea": "KR", "South Sudan": "SS", "Spain": "ES",
  "Sri Lanka": "LK", "Sudan": "SD", "Suriname": "SR", "Svalbard and Jan Mayen": "SJ", "Sweden": "SE",
  "Switzerland": "CH", "Syria": "SY", "Taiwan": "TW", "Tajikistan": "TJ", "Tanzania": "TZ", "Thailand": "TH",
  "Timor-Leste": "TL", "Togo": "TG", "Tokelau": "TK", "Tonga": "TO", "Trinidad and Tobago": "TT", "Tunisia": "TN",
  "Türkiye": "TR", "Turkmenistan": "TM", "Turks and Caicos": "TC", "Tuvalu": "TV", "Uganda": "UG", "Ukraine": "UA",
  "United Arab Emirates": "AE", "United Kingdom": "GB", "United States": "US",
  "United States Minor Outlying Islands": "UM", "United States Virgin Islands": "VI", "Uruguay": "UY",
  "Uzbekistan": "UZ", "Vanuatu": "VU", "Vatican City": "VA", "Venezuela": "VE", "Vietnam": "VN",
  "Wallis and Futuna": "WF", "Western Sahara": "EH", "Yemen": "YE", "Zambia": "ZM", "Zimbabwe": "ZW",
};

// Continents as a traveller means them rather than strict geography: Turkey and Cyprus sit with
// Europe, the Caribbean and Central America with North America.
// prettier-ignore
const CONTINENTS = {
  Europe:
    "AD AL AT AX BA BE BG BY CH CY CZ DE DK EE ES FI FO FR GB GG GI GR HR HU IE IM IS IT JE LI LT LU LV MC MD ME MK MT NL NO PL PT RO RS RU SE SI SJ SK SM TR UA VA",
  Asia:
    "AE AF AM AZ BD BH BN BT CN GE HK ID IL IN IQ IR JO JP KG KH KP KR KW KZ LA LB LK MM MN MO MV MY NP OM PH PK PS QA SA SG SY TH TJ TL TM TW UZ VN YE",
  Africa:
    "AO BF BI BJ BW CD CF CG CI CM CV DJ DZ EG EH ER ET GA GH GM GN GQ GW IO KE KM LR LS LY MA MG ML MR MU MW MZ NA NE NG RE RW SC SD SH SL SN SO SS ST SZ TD TG TN TZ UG YT ZA ZM ZW",
  "North America":
    "AG AI AW BB BL BM BQ BS BZ CA CR CU CW DM DO GD GL GP GT HN HT JM KN KY LC MF MQ MS MX NI PA PM PR SV SX TC TT US VC VG VI",
  "South America":
    "AR BO BR CL CO EC FK GF GY PE PY SR UY VE",
  Oceania:
    "AS AU CC CK CX FJ FM GU KI MH MP NC NF NR NU NZ PF PG PN PW SB TK TO TV UM VU WF WS",
  Antarctica:
    "AQ BV GS HM TF",
} as const;
export type Continent = keyof typeof CONTINENTS;

const CONTINENT_BY_CODE = new Map<string, Continent>(
  (Object.entries(CONTINENTS) as [Continent, string][]).flatMap(([continent, codes]) =>
    codes.split(" ").map((code): [string, Continent] => [code, continent]),
  ),
);

// null for a name that isn't one of ours (old data, a place someone typed)
export const countryCode = (name: string | null | undefined): string | null =>
  (name && (CODES as Record<string, string>)[name]) || null;

export function continentOf(name: string | null | undefined): Continent | null {
  const code = countryCode(name);
  return (code && CONTINENT_BY_CODE.get(code)) || null;
}

export const FLAG_CODES = Object.values(CODES);

// The name people type into a search box, where it differs from the one we store.
const SEARCH_NAMES: Record<string, string> = { Türkiye: "Turkey" };
export const countryLabel = (name: string) => SEARCH_NAMES[name] ?? name;

// A country's part of an address: "/padel/spain", "/pickleball/turks-and-caicos", "/tennis/turkey".
export const countrySlug = (name: string) =>
  countryLabel(name)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

// "in the United States", "in Greece", "in Turkey"
const THE = /^(United |Dominican Republic|Czech Republic|Netherlands|Turks and Caicos|Bahamas|Philippines|Maldives)/;
export const inCountry = (name: string) => `in ${THE.test(countryLabel(name)) ? "the " : ""}${countryLabel(name)}`;
