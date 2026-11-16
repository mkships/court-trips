"use client";

import { useEffect, useId, useRef, useState } from "react";

// One horizontal row of cards with a heading: swipe or scroll it, or use the arrows. Cards snap
// into place, and the arrows hide when everything already fits. Nothing moves by itself.

// width of one card: 1.4 up on phones (so the next one peeks in), then 2, 3, 4 and 5 across
export const CAROUSEL_ITEM =
  "w-[72%] shrink-0 snap-start sm:w-[calc((100%-1.25rem)/2)] md:w-[calc((100%-2.5rem)/3)] lg:w-[calc((100%-3.75rem)/4)] xl:w-[calc((100%-5rem)/5)]";

export function Carousel({ title, intro, action, children }: { title: string; intro?: string; action?: React.ReactNode; children: React.ReactNode }) {
  const id = useId();
  const list = useRef<HTMLUListElement>(null);
  const [edge, setEdge] = useState({ start: true, end: true });

  useEffect(() => {
    const el = list.current;
    if (!el) return;
    const measure = () =>
      setEdge({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", measure);
      observer.disconnect();
    };
  }, []);

  const step = (by: 1 | -1) => {
    const el = list.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: by * el.clientWidth, behavior: reduced ? "auto" : "smooth" });
  };
  const fits = edge.start && edge.end;

  return (
    <section aria-labelledby={id} className="mt-14">
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 id={id} className="text-[1.625rem] leading-tight font-extrabold tracking-[-0.02em]">
            {title}
          </h2>
          {intro && <p className="mt-1 text-[0.9375rem] text-ink-soft">{intro}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {action}
          {!fits && (
            <div className="ml-2 hidden gap-2 sm:flex">
              <Arrow direction="previous" disabled={edge.start} onClick={() => step(-1)} />
              <Arrow direction="next" disabled={edge.end} onClick={() => step(1)} />
            </div>
          )}
        </div>
      </div>
      {/* on phones the row runs to the screen edge, so the last card visibly continues */}
      <ul
        ref={list}
        className="-mx-4 mt-6 flex snap-x snap-mandatory scroll-px-4 gap-5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:scroll-px-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </ul>
    </section>
  );
}

function Arrow({ direction, disabled, onClick }: { direction: "previous" | "next"; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === "next" ? "Show more" : "Show previous"}
      className="grid size-10 place-items-center rounded-full border border-rule bg-white transition-colors hover:border-ink hover:bg-mist disabled:pointer-events-none disabled:opacity-50"
    >
      <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d={direction === "next" ? "M6 3l5 5-5 5" : "M10 3 5 8l5 5"} />
      </svg>
    </button>
  );
}
