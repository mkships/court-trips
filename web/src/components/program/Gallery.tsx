"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { Court } from "@/components/Court";
import { SPORT_NAMES, type Sport } from "@/lib/sports";
import { DIMENSIONS, SURFACES } from "@/lib/surfaces";

// Desktop: Airbnb-style mosaic, one large photo with up to four beside it.
// Phones: a swipeable strip of every photo. Both can open the full set.
export function Gallery({ photos, sport, title }: { photos: string[]; sport: Sport; title: string }) {
  const viewer = useRef<HTMLDialogElement>(null);
  const [shown, setShown] = useState(0);

  if (photos.length === 0) {
    return (
      <figure
        className="mt-7 flex h-[260px] flex-col items-center justify-center rounded-[28px] px-6 md:h-[400px]"
        style={{ backgroundColor: SURFACES[sport].surround }}
      >
        <Court sport={sport} className="h-[70%] w-full max-w-[640px]" />
        <figcaption className="mt-3 text-center text-[0.8125rem] text-white/85">
          {SPORT_NAMES[sport]} court, {DIMENSIONS[sport]}. The organiser hasn&apos;t published photos.
        </figcaption>
      </figure>
    );
  }

  const [main, ...rest] = photos;
  const side = rest.slice(0, rest.length >= 4 ? 4 : 2);
  const open = () => viewer.current?.showModal();

  return (
    <>
      {/* phones */}
      <div className="relative mt-7 -mx-4 md:hidden">
        <ul
          className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none]"
          onScroll={(e) => setShown(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
          aria-label={`${photos.length} photos`}
        >
          {photos.map((src, i) => (
            <li key={src} className="relative aspect-[4/3] w-full shrink-0 snap-center bg-rule">
              <Image src={src} alt={i === 0 ? title : ""} fill priority={i === 0} sizes="100vw" className="object-cover" />
            </li>
          ))}
        </ul>
        {photos.length > 1 && (
          <span className="absolute right-4 bottom-3 rounded-full bg-black/55 px-2.5 py-1 text-[0.8125rem] text-white tabular-nums">
            {shown + 1} / {photos.length}
          </span>
        )}
      </div>

      {/* tablets and up */}
      <div
        className={`relative mt-7 hidden h-[460px] gap-2 overflow-hidden rounded-[28px] md:grid ${
          side.length === 0 ? "" : side.length === 1 ? "grid-cols-2" : "grid-cols-[3fr_2fr]"
        }`}
      >
        <Photo src={main} alt={title} priority onClick={open} />
        {side.length > 0 && (
          <div className={`grid gap-2 ${side.length >= 4 ? "grid-cols-2 grid-rows-2" : "grid-rows-2"}`}>
            {side.map((src) => (
              <Photo key={src} src={src} alt="" onClick={open} />
            ))}
          </div>
        )}
        {photos.length > 1 && (
          <button
            type="button"
            onClick={open}
            className="absolute right-4 bottom-4 rounded-full bg-white px-4 py-2 text-[0.875rem] font-semibold shadow-sm ring-1 ring-ink/10 hover:bg-paper"
          >
            Show all {photos.length} photos
          </button>
        )}
      </div>

      <dialog
        ref={viewer}
        aria-label={`Photos of ${title}`}
        className="m-0 h-full max-h-none w-full max-w-none bg-paper p-0 backdrop:bg-black/40"
        onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-rule bg-paper px-4 py-3 sm:px-8">
          <p className="font-semibold">{photos.length} photos</p>
          <button
            type="button"
            onClick={() => viewer.current?.close()}
            className="rounded-full border border-rule px-4 py-2 text-[0.875rem] font-semibold hover:border-ink"
          >
            Close
          </button>
        </div>
        <ul className="mx-auto grid max-w-[920px] gap-3 px-4 py-6 sm:px-8">
          {photos.map((src) => (
            <li key={src} className="relative aspect-[3/2] overflow-hidden rounded-2xl bg-rule">
              <Image src={src} alt="" fill sizes="(min-width: 920px) 920px, 100vw" className="object-cover" />
            </li>
          ))}
        </ul>
      </dialog>
    </>
  );
}

function Photo({ src, alt, priority, onClick }: { src: string; alt: string; priority?: boolean; onClick: () => void }) {
  return (
    // the "Show all photos" button is the keyboard route into the viewer; these are mouse shortcuts
    <button type="button" tabIndex={-1} onClick={onClick} className="relative min-h-0 cursor-zoom-in bg-rule" aria-hidden="true">
      <Image src={src} alt={alt} fill priority={priority} sizes={alt ? "60vw" : "20vw"} className="object-cover hover:brightness-95" />
    </button>
  );
}
