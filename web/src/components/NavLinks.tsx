"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  ["/", "Home"],
  ["/trips", "Trips"],
  ["/resorts", "Resorts & clubs"],
  ["/operators", "Operators"],
] as const;

// a trip's own page sits under Trips
const isCurrent = (path: string, href: string) =>
  href === "/" ? path === "/" : path === href || path.startsWith(`${href}/`) || (href === "/trips" && path.startsWith("/programs/"));

export function NavLinks() {
  const path = usePathname();
  return (
    <>
      {NAV.map(([href, label]) => (
        <Link
          key={href}
          href={href}
          aria-current={isCurrent(path, href) ? "page" : undefined}
          className="shrink-0 px-3.5 py-2 text-[0.9375rem] font-semibold text-ink-soft underline decoration-transparent decoration-2 underline-offset-[10px] transition-colors hover:text-ink hover:decoration-ink/25 aria-[current=page]:text-ink aria-[current=page]:decoration-ink"
        >
          {label}
        </Link>
      ))}
    </>
  );
}
