import { countryCode } from "@/lib/country-info";

// A country's flag, from the files at /flags (src/app/flags). Nothing for a name we have no flag
// for, so pass a fallback beside it where a row must have an icon. `className` sets its size.
export function CountryFlag({ country, className = "h-6 w-9 rounded-[5px]" }: { country: string; className?: string }) {
  const code = countryCode(country);
  if (!code) return null;
  return (
    // a 1 to 5 KB SVG served as a file: next/image would add nothing
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`/flags/${code.toLowerCase()}.svg`} alt="" width={36} height={24} loading="lazy" className={`shrink-0 ring-1 ring-ink/10 ${className}`} />
  );
}
