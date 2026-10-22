import Image from "next/image";
import { Court } from "@/components/Court";
import { DIMENSIONS, SURFACES } from "@/lib/surfaces";
import { SPORT_NAMES, type Sport } from "@/lib/sports";

// Airbnb-style mosaic: one large photo, up to four beside it. Phones see the first photo.
export function Gallery({ photos, sport, title }: { photos: string[]; sport: Sport; title: string }) {
  if (photos.length === 0) {
    return (
      <figure
        className="mt-7 flex h-[260px] flex-col items-center justify-center rounded-[28px] px-6 md:h-[400px]"
        style={{ backgroundColor: SURFACES[sport].surround }}
      >
        <Court sport={sport} className="h-[70%] w-full max-w-[640px]" />
        <figcaption className="mt-3 text-[0.8125rem] text-white/75">
          {SPORT_NAMES[sport]} court, {DIMENSIONS[sport]}. The organiser hasn&apos;t published photos.
        </figcaption>
      </figure>
    );
  }

  const [main, ...rest] = photos;
  const side = rest.slice(0, rest.length >= 4 ? 4 : 2);
  return (
    <div
      className={`mt-7 grid gap-2 overflow-hidden rounded-[28px] md:h-[460px] ${
        side.length === 0 ? "" : side.length === 1 ? "md:grid-cols-2" : "md:grid-cols-[3fr_2fr]"
      }`}
    >
      <Photo src={main} alt={title} priority className="aspect-[4/3] md:aspect-auto" sizes="(min-width: 768px) 60vw, 100vw" />
      {side.length > 0 && (
        <div className={`hidden gap-2 md:grid ${side.length >= 4 ? "grid-cols-2 grid-rows-2" : "grid-rows-2"}`}>
          {side.map((src) => (
            <Photo key={src} src={src} alt="" sizes="20vw" />
          ))}
        </div>
      )}
    </div>
  );
}

function Photo({ src, alt, sizes, priority, className = "" }: { src: string; alt: string; sizes: string; priority?: boolean; className?: string }) {
  return (
    <div className={`relative min-h-0 bg-rule ${className}`}>
      <Image src={src} alt={alt} fill priority={priority} sizes={sizes} className="object-cover" />
    </div>
  );
}
