"use client";

import { useEffect, useRef, useState } from "react";
import type { Sport } from "@/lib/sports";
import { SURFACES } from "@/lib/surfaces";

// Top-down court plans in metres, centred on the net. Every sport has the
// same 12 segments in the same slots so one court can morph into another;
// lines a sport doesn't have collapse onto a line it does.
type Seg = [number, number, number, number];
type Plan = { hx: number; hy: number; segs: Seg[] };

function outline(hx: number, hy: number): Seg[] {
  return [
    [-hx, -hy, hx, -hy],
    [-hx, hy, hx, hy],
    [-hx, -hy, -hx, hy],
    [hx, -hy, hx, hy],
  ];
}

const PLANS: Record<Sport, Plan> = {
  // 23.77 × 10.97 doubles, 8.23 singles, service line 6.40 from the net
  tennis: {
    hx: 11.885,
    hy: 5.485,
    segs: [
      ...outline(11.885, 5.485),
      [0, -5.9, 0, 5.9],
      [-6.4, -4.115, -6.4, 4.115],
      [6.4, -4.115, 6.4, 4.115],
      [-6.4, 0, 6.4, 0],
      [-11.885, -4.115, 11.885, -4.115],
      [-11.885, 4.115, 11.885, 4.115],
      [-11.885, 0, -11.585, 0],
      [11.585, 0, 11.885, 0],
    ],
  },
  // 13.41 × 6.10, non-volley zone 2.13 each side of the net
  pickleball: {
    hx: 6.705,
    hy: 3.05,
    segs: [
      ...outline(6.705, 3.05),
      [0, -3.45, 0, 3.45],
      [-2.13, -3.05, -2.13, 3.05],
      [2.13, -3.05, 2.13, 3.05],
      [0, 0, 0, 0],
      [-6.705, -3.05, 6.705, -3.05],
      [-6.705, 3.05, 6.705, 3.05],
      [-6.705, 0, -2.13, 0],
      [2.13, 0, 6.705, 0],
    ],
  },
  // 20 × 10, service lines 6.95 from the net, centre line runs 0.2 past them
  padel: {
    hx: 10,
    hy: 5,
    segs: [
      ...outline(10, 5),
      [0, -5.4, 0, 5.4],
      [-6.95, -5, -6.95, 5],
      [6.95, -5, 6.95, 5],
      [-7.15, 0, 7.15, 0],
      [-10, -5, 10, -5],
      [-10, 5, 10, 5],
      [-10, 0, -10, 0],
      [10, 0, 10, 0],
    ],
  },
};

const DURATION = 700;
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

function mix(a: Plan, b: Plan, t: number): Plan {
  const l = (x: number, y: number) => x + (y - x) * t;
  return {
    hx: l(a.hx, b.hx),
    hy: l(a.hy, b.hy),
    segs: a.segs.map((s, i) => s.map((v, j) => l(v, b.segs[i][j])) as Seg),
  };
}

// Where the ball lands, as fractions of the court's half-length and half-width. Even shots land on
// the left, odd ones on the right, so every shot crosses the net.
const SPOTS: [number, number][] = [
  [-0.62, 0.42],
  [0.58, -0.46],
  [-0.4, -0.52],
  [0.7, 0.3],
  [-0.74, -0.12],
  [0.36, 0.55],
];

// drawIn: on first render the lines are painted across the court once, left to right,
// like a line-marking machine. Later sport changes morph instead. Skipped for reduced motion.
// rally: a shot count; each new count hits the ball over the net to its next spot.
type CourtProps = { sport: Sport; className?: string; drawIn?: boolean; rally?: number };

export function Court({ sport, className, drawIn, rally }: CourtProps) {
  const [plan, setPlan] = useState<Plan>(PLANS[sport]);
  const current = useRef(plan);
  current.current = plan;

  useEffect(() => {
    const from = current.current;
    const to = PLANS[sport];
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPlan(to);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION);
      setPlan(mix(from, to, ease(t)));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [sport]);

  return (
    // Fixed 28 × 15 m frame, so a pickleball court really is smaller than a tennis court.
    <svg viewBox="-14 -7.5 28 15" className={className} aria-hidden="true">
      <rect
        x={-plan.hx}
        y={-plan.hy}
        width={plan.hx * 2}
        height={plan.hy * 2}
        style={{ fill: SURFACES[sport].court, transition: `fill ${DURATION}ms` }}
      />
      <g
        stroke="var(--color-line)"
        strokeWidth={2.5}
        vectorEffect="non-scaling-stroke"
        className={drawIn ? "animate-[court-draw_1000ms_cubic-bezier(0.65,0,0.35,1)_250ms_both] motion-reduce:animate-none" : undefined}
      >
        {plan.segs.map(([x1, y1, x2, y2], i) => (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} vectorEffect="non-scaling-stroke" />
        ))}
      </g>
      {rally != null && <Ball sport={sport} shot={rally} delayed={drawIn} />}
    </svg>
  );
}

// Seen from above, a ball in the air is a ball closer to you: it grows and lifts off its shadow
// mid-flight, then lands. Travel uses the court's morph timing, so a sport change carries it along.
const HOP = "animate-[ball-hop_700ms_ease-in-out] motion-reduce:animate-none";
const HOP_SHADOW = "animate-[ball-shadow_700ms_ease-in-out] motion-reduce:animate-none";
const FROM_CENTRE = { transformBox: "fill-box", transformOrigin: "center" } as const;

function Ball({ sport, shot, delayed }: { sport: Sport; shot: number; delayed?: boolean }) {
  const { hx, hy } = PLANS[sport];
  const [fx, fy] = SPOTS[shot % SPOTS.length];
  return (
    <g
      className={delayed ? "animate-[ball-in_300ms_ease-out_1250ms_both] motion-reduce:animate-none" : undefined}
      style={{
        transform: `translate(${fx * hx}px, ${fy * hy}px)`,
        transition: `transform ${DURATION}ms cubic-bezier(0.45, 0, 0.55, 1)`,
      }}
    >
      {/* new key per shot, so the hop plays again */}
      <g key={shot} className={shot > 0 ? HOP_SHADOW : undefined} style={FROM_CENTRE}>
        <ellipse cx="0.18" cy="0.22" rx="0.5" ry="0.42" fill="rgb(0 0 0 / 0.28)" />
      </g>
      <g key={`b${shot}`} className={shot > 0 ? HOP : undefined} style={FROM_CENTRE}>
        <circle r="0.5" fill="var(--color-ball)" />
        <path
          d="M-0.36 -0.34a0.55 0.55 0 0 1 0 0.68M0.36 -0.34a0.55 0.55 0 0 0 0 0.68"
          fill="none"
          stroke="#fff"
          strokeOpacity="0.85"
          strokeWidth="0.09"
          strokeLinecap="round"
        />
      </g>
    </g>
  );
}
