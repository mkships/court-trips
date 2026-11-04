"use client";

import { SafeImage } from "@/components/SafeImage";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Court } from "@/components/Court";
import { SURFACES } from "@/lib/surfaces";
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
  // every change of featured trip is a shot: the ball on the court crosses the net with it
  const [shots, setShots] = useState(0);

  // The row is held at the hero's height: a longer heading (pickleball's runs to three lines) shrinks
  // the court drawing rather than stretching the row, which pushed the photo caption under the search bar.
  return (
    <div className="on-surface grid overflow-hidden rounded-[28px] md:h-[500px] md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:grid-rows-[minmax(0,1fr)]">
      <div
        className="flex min-h-0 flex-col px-6 pt-7 pb-6 text-white sm:px-9 sm:pt-9 md:pb-14"
        style={{ backgroundColor: SURFACES[sport].surround, transition: "background-color 700ms" }}
      >
        <div role="group" aria-label="Sport" className="flex flex-wrap gap-2">
          {SPORTS.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={sport === value}
              onClick={() => onSportChange(value)}
              className="rounded-full border border-white/40 px-4 py-1.5 text-[0.9375rem] font-semibold transition-colors hover:border-white hover:bg-white/15 aria-pressed:border-white aria-pressed:bg-white aria-pressed:text-ink"
            >
              {SPORT_NAMES[value]}
            </button>
          ))}
        </div>

        <h1 className="mt-7 text-[2.25rem] leading-[0.95] font-black tracking-[-0.035em] text-balance sm:text-[2.5rem] md:mt-6 lg:text-[3.25rem]">
          {mode === "programs" ? `Play ${name.toLowerCase()} somewhere new` : `Stay where the ${name.toLowerCase()} courts are`}
        </h1>

        {/* Phones: summary and court side by side. Wider: stacked, court pinned to the bottom. */}
        <div className="mt-4 flex items-end justify-between gap-5 md:contents">
          <p className="max-w-[34ch] text-[1rem] leading-snug text-pretty text-white/85 md:mt-4 md:text-[1.0625rem]">
            {mode === "programs"
              ? `Coached camps, clinics and getaways in ${whereLabel(stats.countries)}.`
              : "Resorts and hotels with courts on site."}
          </p>
          <div className="w-[44%] shrink-0 md:relative md:mt-5 md:min-h-0 md:w-full md:flex-1">
            <Court
              sport={sport}
              drawIn
              rally={shots}
              className="block aspect-[28/15] w-full md:absolute md:bottom-0 md:left-0 md:h-full md:max-h-[190px] md:w-auto"
            />
          </div>
        </div>
      </div>

      <FeaturedPhotos key={sport} featured={featured} onStep={() => setShots((n) => n + 1)} />
    </div>
  );
}

// Few countries read better named than counted: "Greece, Italy, the UK and the US".
const SHORT_NAMES: Record<string, string> = { "United Kingdom": "the UK", "United States": "the US" };
function whereLabel(countries: string[]) {
  if (countries.length > 4) return `${countries.length} countries`;
  const names = countries.map((c) => SHORT_NAMES[c] ?? c);
  return names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

const SWIPE_PX = 40;
// long enough to read the trip's name, place and price before it moves on
const AUTOPLAY_MS = 6000;

function FeaturedPhotos({ featured, onStep }: { featured: Listing[]; onStep: () => void }) {
  const [index, setIndex] = useState(0);
  // the slide being faded out stays fully visible underneath, so the two never blend into each other
  const [previous, setPrevious] = useState<number | null>(null);
  // the carousel moves on by itself unless the visitor prefers less motion or presses pause
  const [playing, setPlaying] = useState(false);
  // and holds still while someone is pointing at it or using its controls
  const [held, setHeld] = useState(false);
  const touchX = useRef<number | null>(null);
  const current = featured[index];
  const step = (by: number) => {
    onStep();
    setPrevious(index);
    setIndex((index + by + featured.length) % featured.length);
  };
  const moving = playing && !held && featured.length > 1;

  useEffect(() => {
    setPlaying(!window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  // restarts on every change of slide, so a manual step gets a full interval too
  useEffect(() => {
    if (!moving) return;
    // in a background tab, wait for another interval rather than move on unseen
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => (document.hidden ? (timer = setTimeout(tick, AUTOPLAY_MS)) : step(1));
    timer = setTimeout(tick, AUTOPLAY_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- step only reads index and featured.length
  }, [moving, index, featured.length]);

  return (
    <section
      aria-label="Featured trips"
      aria-roledescription="carousel"
      className="relative aspect-[4/3] touch-pan-y bg-ink md:aspect-auto"
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setHeld(false)}
      onTouchStart={(e) => {
        touchX.current = e.touches[0].clientX;
        setHeld(true);
      }}
      onTouchEnd={(e) => {
        setHeld(false);
        if (touchX.current == null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > SWIPE_PX) step(dx < 0 ? 1 : -1);
        touchX.current = null;
      }}
    >
      {/* own stacking layer, so the slides' order doesn't lift them over the caption and controls */}
      <div className="absolute inset-0 isolate">
        {featured.map((listing, i) => (
          <div
            key={listing.key}
            className={`absolute inset-0 ${i === index ? "z-[2] transition-opacity duration-700 motion-reduce:transition-none" : i === previous ? "z-[1]" : ""}`}
            style={{ opacity: i === index || i === previous ? 1 : 0 }}
          >
            <SafeImage
              sport={listing.sports[0] as Sport}
              src={listing.photos[0]}
              alt=""
              fill
              priority={i === 0}
              sizes="(min-width: 768px) 60vw, 100vw"
              className="object-cover"
            />
          </div>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[65%] bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

      <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-7 md:pr-60 md:pb-16">
        {/* announced when someone steps through it, not every few seconds while it plays */}
        <div aria-live={moving ? "off" : "polite"}>
          <p className="text-[0.9375rem] text-white/85">{placeLabel(current)}</p>
          <Link
            href={tileHref(current)}
            className="mt-1 block text-[1.5rem] leading-tight font-extrabold tracking-[-0.02em] underline decoration-transparent decoration-2 underline-offset-4 transition-colors hover:decoration-white sm:text-[1.75rem]"
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
        <div className="absolute top-4 right-4 flex items-center gap-2 md:top-auto md:right-7 md:bottom-16">
          <span className="mr-1 rounded-full bg-black/35 px-2.5 py-1 text-[0.8125rem] text-white tabular-nums md:bg-transparent md:px-0 md:text-white/80">
            {index + 1} of {featured.length}
          </span>
          <div className="relative">
            <RoundButton label={playing ? "Pause featured trips" : "Play featured trips"} onClick={() => setPlaying(!playing)}>
              {playing ? <path d="M5.5 3.5v9M10.5 3.5v9" /> : <path d="M5.5 3.2v9.6L12.5 8 5.5 3.2Z" fill="currentColor" />}
            </RoundButton>
            {/* time until the next trip, drawn round the button; starts over on each slide and after a pause */}
            {moving && (
              <svg key={index} viewBox="0 0 44 44" className="pointer-events-none absolute -inset-0.5 -rotate-90" aria-hidden="true">
                <circle
                  cx="22"
                  cy="22"
                  r="20.5"
                  fill="none"
                  stroke="var(--color-ball)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  pathLength="100"
                  strokeDasharray="100"
                  style={{ animation: `carousel-progress ${AUTOPLAY_MS}ms linear forwards` }}
                />
              </svg>
            )}
          </div>
          <ArrowButton direction="previous" onClick={() => step(-1)} />
          <ArrowButton direction="next" onClick={() => step(1)} />
        </div>
      )}
    </section>
  );
}

function RoundButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="grid h-10 w-10 place-items-center rounded-full bg-white/90 text-ink shadow-sm transition-colors hover:bg-ball"
    >
      <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </svg>
    </button>
  );
}

function ArrowButton({ direction, onClick }: { direction: "previous" | "next"; onClick: () => void }) {
  return (
    <RoundButton label={direction === "next" ? "Next featured trip" : "Previous featured trip"} onClick={onClick}>
      <path d={direction === "next" ? "M6 3l5 5-5 5" : "M10 3 5 8l5 5"} />
    </RoundButton>
  );
}
