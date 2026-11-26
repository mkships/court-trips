import type { Sport } from "@/lib/sports";
import { SURFACES } from "@/lib/surfaces";

// A sport as a tile: a tiny court in that sport's surface colours. It stands for the sport wherever
// a row needs an icon (the search's country list, the Trips menu, links to a sport's page).
// `className` sets the tile's size and corners.
export function CourtTile({ sport, className = "size-12 rounded-xl" }: { sport: Sport; className?: string }) {
  return (
    <span className={`grid shrink-0 place-items-center ${className}`} style={{ backgroundColor: SURFACES[sport].surround }} aria-hidden="true">
      <span className="relative block h-[42%] w-[66%] border-[1.5px] border-white" style={{ backgroundColor: SURFACES[sport].court }}>
        <span className="absolute inset-y-[-3px] left-1/2 w-[1.5px] -translate-x-1/2 bg-white" />
      </span>
    </span>
  );
}
