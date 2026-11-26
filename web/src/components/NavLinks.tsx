"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { LinkIcon } from "@/components/LinkIcon";
import { PinIcon } from "@/components/icons";
import type { MenuLink, TripsMenu } from "@/lib/landing";
import { LINK } from "@/lib/ui";

const NAV = [
  ["/", "Home"],
  ["/trips", "Trips"],
  ["/resorts", "Resorts & clubs"],
  ["/operators", "Operators"],
] as const;

// a trip's own page sits under Trips, and so do the sport and destination pages that list trips
const UNDER_TRIPS = /^\/(programs|tennis|pickleball|padel|destinations)(\/|$)/;
const isCurrent = (path: string, href: string) =>
  href === "/" ? path === "/" : path === href || path.startsWith(`${href}/`) || (href === "/trips" && UNDER_TRIPS.test(path));

const TAB =
  "shrink-0 px-3.5 py-2 text-[0.9375rem] font-semibold text-ink-soft underline decoration-transparent decoration-2 underline-offset-[10px] transition-colors hover:text-ink hover:decoration-ink/25 aria-[current=page]:text-ink aria-[current=page]:decoration-ink";

// The header's four sections, and the menu Trips opens: every sport with its formats and busiest
// countries, and the country hubs. It opens on a click or tap, never on hover, so it can't pop open
// by accident and works the same with a mouse, a finger or a keyboard.
//
// The panel is a sibling of the tab row, placed against the header: the row scrolls sideways on phones
// and would clip anything inside it. It is in the page even while closed (hidden, not left out), so
// every page links to the sport and country pages for search engines too.
export function HeaderNav({ menu }: { menu: TripsMenu }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const tab = useRef<HTMLAnchorElement>(null);
  const panel = useRef<HTMLElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    // a keyboard user lands on the first link; Esc brings them back to the tab
    panel.current?.querySelector<HTMLElement>("a")?.focus({ preventScroll: true });
    const inside = (target: EventTarget | null) => panel.current?.contains(target as Node) || tab.current?.contains(target as Node);
    const onDown = (e: PointerEvent) => !inside(e.target) && setOpen(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      tab.current?.focus();
    };
    // tabbing past the last link closes it, like leaving any other menu
    const onFocus = (e: FocusEvent) => !inside(e.target) && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    document.addEventListener("focusin", onFocus);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("focusin", onFocus);
    };
  }, [open]);

  return (
    <>
      <nav
        aria-label="Sections"
        className="col-span-2 row-start-2 -mx-4 flex gap-0.5 overflow-x-auto px-1 [scrollbar-width:none] sm:-ml-3.5 sm:px-0 lg:col-span-1 lg:col-start-2 lg:row-start-1 lg:mx-0 [&::-webkit-scrollbar]:hidden"
      >
        {NAV.map(([href, label]) =>
          href === "/trips" ? (
            // A link to the search for anyone without scripts; with them it's the menu's button.
            <Link
              key={href}
              ref={tab}
              href={href}
              role="button"
              aria-expanded={open}
              aria-controls={id}
              aria-current={isCurrent(path, href) ? "page" : undefined}
              onClick={(e) => {
                e.preventDefault();
                setOpen(!open);
              }}
              onKeyDown={(e) => {
                // a button answers to Space as well as Enter
                if (e.key !== " ") return;
                e.preventDefault();
                setOpen(!open);
              }}
              className={`inline-flex items-center gap-1 ${TAB} ${open ? "text-ink" : ""}`}
            >
              {label}
              <svg viewBox="0 0 16 16" className={`size-3.5 transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`} aria-hidden="true">
                <path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          ) : (
            <Link key={href} href={href} aria-current={isCurrent(path, href) ? "page" : undefined} className={TAB}>
              {label}
            </Link>
          ),
        )}
      </nav>

      <nav
        id={id}
        ref={panel}
        hidden={!open}
        aria-label="Trips"
        // choosing a link closes it, including a link to the page you're already on.
        // The height leaves room for a trip page's booking bar on a phone; a long menu scrolls inside.
        onClick={(e) => (e.target as HTMLElement).closest("a") && setOpen(false)}
        className="absolute inset-x-4 top-full z-50 max-h-[calc(100dvh-12.5rem)] overflow-y-auto rounded-3xl bg-white p-5 shadow-pop ring-1 ring-ink/5 sm:inset-x-8 sm:p-7 lg:inset-x-[min(5vw,4.5rem)]"
      >
        <div className="grid gap-x-8 gap-y-7 sm:grid-cols-2 lg:grid-cols-4">
          {menu.sports.map((s) => (
            <section key={s.sport} aria-labelledby={`${id}-${s.sport}`}>
              <Title id={`${id}-${s.sport}`}>{s.name}</Title>
              <List links={[{ href: s.href, label: `All ${s.name.toLowerCase()} trips`, count: s.trips, sport: s.sport }, ...s.formats]} />
              {s.countries.length > 0 && (
                <>
                  <p className="mt-4 px-3 text-[0.8125rem] font-semibold text-ink-soft">By country</p>
                  <List links={s.countries} />
                </>
              )}
            </section>
          ))}
          <section aria-labelledby={`${id}-destinations`}>
            <Title id={`${id}-destinations`}>Destinations</Title>
            <List links={menu.destinations} />
            <List links={[{ href: "/destinations", label: "All destinations" }]} icon={<PinIcon className="size-5" />} tight />
          </section>
        </div>
        <p className="mx-3 mt-6 border-t border-rule pt-5">
          <Link href="/trips" className={`text-[0.9375rem] ${LINK}`}>
            Search all trips by month and level
          </Link>
        </p>
      </nav>
    </>
  );
}

function Title({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="px-3 text-[1.0625rem] font-extrabold tracking-[-0.01em]">
      {children}
    </h2>
  );
}

// Each link leads with its picture (a format's icon, a flag, the sport's court), in a column of its
// own so the labels line up. `icon` is for a link that is none of those; `tight` continues a list.
function List({ links, icon, tight = false }: { links: MenuLink[]; icon?: React.ReactNode; tight?: boolean }) {
  return (
    <ul className={tight ? undefined : "mt-1.5"}>
      {links.map((l) => (
        <li key={l.href}>
          <Link href={l.href} className="flex items-center gap-3 rounded-xl px-3 py-1.5 text-[0.9375rem] transition-colors hover:bg-mist">
            <span className="grid w-6 shrink-0 place-items-center">{icon ?? <LinkIcon {...l} />}</span>
            <span className="min-w-0 flex-1">{l.label}</span>
            {l.count != null && <span className="text-[0.875rem] text-ink-soft tabular-nums">{l.count}</span>}
          </Link>
        </li>
      ))}
    </ul>
  );
}
