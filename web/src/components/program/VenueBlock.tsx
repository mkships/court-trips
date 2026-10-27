import { SafeImage } from "@/components/SafeImage";
import type { ProgramDetail, Sport, Venue } from "@/lib/sports";
import { placeLabel } from "@/lib/format";

export function VenueBlock({ program, venue, sport }: { program: ProgramDetail; venue: Venue | null; sport: Sport }) {
  if (!venue) {
    return (
      <p className="text-[1rem]">
        <span className="font-semibold">{program.venueName}</span>, {placeLabel(program)}
      </p>
    );
  }
  const courts = venue.courts
    .filter((c) => c.sport === sport)
    .map((c) => [c.count, c.surface?.toLowerCase(), `${c.sport} ${c.count === 1 ? "court" : "courts"}`].filter(Boolean).join(" "));

  return (
    <div className="flex max-w-[640px] gap-5">
      {venue.photos[0] && (
        <div className="relative aspect-square w-28 shrink-0 overflow-hidden rounded-2xl bg-rule sm:w-36">
          <SafeImage sport={sport} src={venue.photos[0]} alt="" fill sizes="144px" className="object-cover" />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-[1.125rem] font-extrabold">{venue.name}</p>
        <p className="text-ink-soft">
          <span className="capitalize">{venue.kind}</span> in {placeLabel(venue)}
        </p>
        {courts.length > 0 && <p className="mt-1 text-ink-soft first-letter:uppercase">{courts.join(", ")}</p>}
        <a href={venue.website} className="mt-2 inline-block font-semibold underline underline-offset-4" target="_blank" rel="noopener noreferrer">
          Venue website
        </a>
      </div>
    </div>
  );
}
