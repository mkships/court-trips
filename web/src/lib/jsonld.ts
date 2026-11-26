import { siteUrl } from "@/lib/site";
import type { ProgramDetail } from "@/lib/sports";

// Structured data (schema.org, as JSON-LD): the same facts a page shows, in the form search engines
// read to draw breadcrumbs, dates and prices under a result. Each function returns one object for
// <JsonLd> (src/components/JsonLd.tsx). Only say here what the page itself says.

const abs = (path: string) => new URL(path, siteUrl()).toString();

export type Crumb = { name: string; href: string };

export const breadcrumbs = (crumbs: Crumb[]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: abs(c.href) })),
});

export const itemList = (name: string, items: { name: string; href: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "ItemList",
  name,
  numberOfItems: items.length,
  itemListElement: items.map((item, i) => ({ "@type": "ListItem", position: i + 1, name: item.name, url: abs(item.href) })),
});

export const organization = () => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Court Trips",
  url: abs("/"),
  logo: abs("/icons/icon-512.png"),
  description: "An independent directory of coached tennis, pickleball and padel camps, clinics and getaways.",
});

export const website = () => ({ "@context": "https://schema.org", "@type": "WebSite", name: "Court Trips", url: abs("/") });

const AVAILABILITY = { available: "InStock", waitlist: "LimitedAvailability", sold_out: "SoldOut" } as const;
// a search engine reads a handful of dates, not a season's worth
const MAX_EVENTS = 10;

// One event per upcoming set of dates of a trip. A trip with no dates yet has nothing to say here.
export function tripEvents(program: ProgramDetail) {
  const url = abs(`/programs/${program.slug}`);
  return program.sessions.slice(0, MAX_EVENTS).map((s) => ({
    "@context": "https://schema.org",
    "@type": "Event",
    name: program.title,
    description: program.description || undefined,
    startDate: s.start,
    endDate: s.end,
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    url: `${url}?date=${s.start}`,
    image: program.photos.length ? program.photos.slice(0, 3).map((p) => abs(p)) : undefined,
    location: {
      "@type": "Place",
      name: program.venueName ?? program.place ?? program.country ?? program.title,
      address: {
        "@type": "PostalAddress",
        addressLocality: program.place ?? undefined,
        addressCountry: program.country ?? undefined,
      },
    },
    organizer: { "@type": "Organization", name: program.organizer },
    offers:
      s.price != null && program.currency
        ? {
            "@type": "Offer",
            price: s.price,
            priceCurrency: program.currency,
            availability: `https://schema.org/${AVAILABILITY[s.status]}`,
            // the operator takes the booking; this page is where the offer is described and linked from
            url,
          }
        : undefined,
  }));
}
