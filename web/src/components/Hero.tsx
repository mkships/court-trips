"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Court } from "@/components/Court";
import { DIMENSIONS, SURFACES } from "@/lib/surfaces";
import { dateRange, placeLabel, priceFrom } from "@/lib/format";
import { tileHref } from "@/lib/tiles";
import { SPORTS, SPORT_NAMES, type Listing, type Mode, type Sport, type SportStats } from "@/lib/sports";

type Props = {
  mode: Mode;
  sport: Sport;
  onSportChange: (sport: Sport) => void;
  stats: SportStats;
  featured: Listing[];
};

export function Hero({ mode, sport, onSportChange, stats, featured }: Props) {
  const name = SPORT_NAMES[sport];

  return (
    <div className="grid overflow-hidden rounded-[28px] md:h-[600px] md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <div
        className="flex flex-col px-6 pt-7 pb-6 text-white sm:px-9 sm:pt-9 md:pb-20"
        style={{ backgroundColor: SURFACES[sport].surround, transition: "background-color 700ms" }}
      >
        <div role="radiogroup" aria-label="Sport" className="flex flex-wrap gap-2">
          {SPORTS.map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={sport === value}
              onClick={() => onSportChange(value)}
              className="rounded-full border border-white/40 px-4 py-1.5 text-[0.9375rem] font-semibold hover:border-white aria-checked:border-white aria-checked:bg-white aria-checked:text-ink"
            >
              {SPORT_NAMES[value]}
            </button>
          ))}
        </div>

        <h1 className="mt-7 text-[2.25rem] leading-[0.95] font-black tracking-[-0.035em] text-balance sm:text-[2.5rem] md:mt-8 lg:text-[3.25rem]">
          {mode === "programs" ? `${name} trips with coaching built in` : `Stay where the ${name.toLowerCase()} courts are`}
        </h1>

        {/* Phones: summary and court side by side. Wider: stacked, court pinned to the bottom. */}
        <div className="mt-4 flex items-end justify-between gap-5 md:contents">
          <p className="max-w-[34ch] text-[1rem] leading-snug text-white/85 md:mt-4 md:text-[1.0625rem]">
            {mode === "programs"
              ? `${stats.programs} camps, clinics and getaways in ${stats.countries.length} countries.`
              : `Resorts and hotels with ${name.toLowerCase()} courts on site.`}
          </p>
          <figure className="w-[44%] shrink-0 md:mt-auto md:w-full">
            <Court sport={sport} className="block aspect-[28/15] w-full" />
            <figcaption className="mt-1.5 text-[0.75rem] text-white/70 tabular-nums md:mt-2 md:text-[0.8125rem]">
              <span className="hidden md:inline">{name} court, </span>
              {DIMENSIONS[sport]}
              <span className="hidden md:inline">, drawn to scale</span>
            </figcaption>
          </figure>
        </div>
      </div>

      <FeaturedPhotos key={sport} featured={featured} />
    </div>
  );
}

function FeaturedPhotos({ featured }: { featured: Listing[] }) {
  const [index, setIndex] = useState(0);
  const current = featured[index];
  const step = (by: number) => setIndex((i) => (i + by + featured.length) % featured.length);

  return (
    <section aria-label="Featured trips" className="relative aspect-[4/3] bg-ink md:aspect-auto">
      {featured.map((listing, i) => (
        <Image
          key={listing.key}
          src={listing.photos[0]}
          alt=""
          fill
          priority={i === 0}
          sizes="(min-width: 768px) 60vw, 100vw"
          className="object-cover transition-opacity duration-500 motion-reduce:transition-none"
          style={{ opacity: i === index ? 1 : 0 }}
        />
      ))}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[65%] bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

      <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-7 md:pr-60 md:pb-20">
        <div aria-live="polite">
          <p className="text-[0.9375rem] text-white/85">{placeLabel(current)}</p>
          <Link
            href={tileHref(current)}
            className="mt-1 block text-[1.5rem] leading-tight font-extrabold tracking-[-0.02em] hover:underline sm:text-[1.75rem]"
          >
            {current.title}
          </Link>
          <p className="mt-1.5 text-[0.9375rem] text-white/85">
            {dateRange(current)}
            {priceFrom(current) && <span className="ml-3 font-semibold text-white">{priceFrom(current)}</span>}
          </p>
        </div>
      </div>

      {featured.length > 1 && (
        <div className="absolute top-4 right-4 flex items-center gap-2 md:top-auto md:right-7 md:bottom-20">
          <span className="mr-1 rounded-full bg-black/35 px-2.5 py-1 text-[0.8125rem] text-white tabular-nums md:bg-transparent md:px-0 md:text-white/80">
            {index + 1} of {featured.length}
          </span>
          <ArrowButton direction="previous" onClick={() => step(-1)} />
          <ArrowButton direction="next" onClick={() => step(1)} />
        </div>
      )}
    </section>
  );
}

function ArrowButton({ direction, onClick }: { direction: "previous" | "next"; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={direction === "next" ? "Next featured trip" : "Previous featured trip"}
      className="grid h-10 w-10 place-items-center rounded-full bg-white/90 text-ink hover:bg-white"
    >
      <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true">
        <path
          d={direction === "next" ? "M6 3l5 5-5 5" : "M10 3 5 8l5 5"}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
