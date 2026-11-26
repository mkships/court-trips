import { CountryFlag } from "@/components/CountryFlag";
import { CourtTile } from "@/components/CourtTile";
import { CategoryIcon } from "@/components/icons";
import type { MenuLink } from "@/lib/landing";

// The small picture in front of a link to a landing page: the format's icon, the country's flag,
// or the sport's court. Nothing for a link that is none of those.
export function LinkIcon({ sport, format, country }: Pick<MenuLink, "sport" | "format" | "country">) {
  if (format) return <CategoryIcon category={format} className="size-5" />;
  if (country) return <CountryFlag country={country} className="h-4 w-6 rounded-[3px]" />;
  if (sport) return <CourtTile sport={sport} className="h-4 w-6 rounded-[3px]" />;
  return null;
}
