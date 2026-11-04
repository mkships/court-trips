import type { ReactNode, SVGProps } from "react";
import type { Listing } from "@/lib/sports";

// Court Trips icons: rounded line drawings on a 24px grid, with one shape filled in the ball
// colour. Strokes use currentColor, so they follow the text they sit beside.

type IconProps = Omit<SVGProps<SVGSVGElement>, "children"> & { accent?: string };

function Icon({ className = "size-5", children, ...rest }: IconProps & { children: ReactNode }) {
  const svg = { ...rest };
  delete svg.accent; // read by each icon for its fill; not an SVG attribute
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
      {...svg}
    >
      {children}
    </svg>
  );
}

const fill = (accent?: string) => accent ?? "var(--color-ball)";

// --- program kinds ---------------------------------------------------------------------------

export function CampIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 5 3.5 19.5h17L12 5Z" fill={fill(props.accent)} />
      <path d="M12 5 10.4 2.5M12 5l1.6-2.5M9 19.5l3-6 3 6" />
    </Icon>
  );
}

export function ClinicIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="9" cy="14.5" r="5" fill={fill(props.accent)} />
      <path d="M9 9.5h11v3.6h-6.4" />
      <circle cx="9" cy="14.5" r="1.4" />
      <path d="M5.5 10.9 3.4 8.6" />
    </Icon>
  );
}

export function GetawayIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M7 14.5a5 5 0 0 1 10 0Z" fill={fill(props.accent)} />
      <path d="M3 14.5h18M12 4.5v2M5.6 7.6 7 9M18.4 7.6 17 9" />
      <path d="M5 18.5c1.4 0 1.4.9 2.8.9s1.4-.9 2.8-.9 1.4.9 2.8.9 1.4-.9 2.8-.9 1.4.9 2.8.9" />
    </Icon>
  );
}

export function CategoryIcon({ category, ...props }: IconProps & { category: Listing["category"] }) {
  if (category === "camp") return <CampIcon {...props} />;
  if (category === "clinic") return <ClinicIcon {...props} />;
  return <GetawayIcon {...props} />;
}

// --- playing level ---------------------------------------------------------------------------
// One level fills the bars up to it, like a signal; a span ("Intermediate+") fills the levels it
// covers; every level is a group of people.

const STEPS = ["beginner", "intermediate", "advanced"] as const;

export function LevelIcon({ level, ...props }: IconProps & { level: readonly string[] }) {
  const steps = STEPS.map((s) => level.includes(s));
  const count = steps.filter(Boolean).length;
  if (level.includes("all levels") || count === 0 || count === STEPS.length) return <PeopleIcon {...props} />;
  const top = steps.lastIndexOf(true);
  const bars = [
    { x: 4, h: 6 },
    { x: 10.25, h: 10 },
    { x: 16.5, h: 14 },
  ];
  return (
    <Icon {...props}>
      {bars.map((b, i) => {
        const on = count === 1 ? i <= top : steps[i];
        return (
          <rect
            key={b.x}
            x={b.x}
            y={20 - b.h}
            width="3.5"
            height={b.h}
            rx="1.2"
            fill={on ? fill(props.accent) : "none"}
            strokeOpacity={on ? 1 : 0.35}
          />
        );
      })}
    </Icon>
  );
}

// --- what's included -------------------------------------------------------------------------

export function BedIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="6.5" y="9" width="5" height="3.5" rx="1.2" fill={fill(props.accent)} />
      <path d="M3 18.5V6M3 12.5h18v6M21 15.5H3M13.5 12.5V9h5a2.5 2.5 0 0 1 2.5 2.5v1" />
    </Icon>
  );
}

export function MealIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12.5" r="4.2" fill={fill(props.accent)} />
      <circle cx="12" cy="12.5" r="7" />
      <path d="M2.5 4v4.5a1.5 1.5 0 0 0 3 0V4M4 9.8V20.5M21.5 4c-1.4.6-2 2.4-2 4.6V13h2V4Zm0 9v7.5" />
    </Icon>
  );
}

export function PlaneIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m10.5 13.5-6.7-2.6 1.6-1.6 8 .9 3.8-3.8a1.9 1.9 0 0 1 2.7 2.7l-3.8 3.8.9 8-1.6 1.6-2.6-6.7" fill={fill(props.accent)} />
      <path d="m10.5 13.5-3.2 3.2-2.5-.4-1 1 3 1.5 1.5 3 1-1-.4-2.5 3.2-3.2" />
    </Icon>
  );
}

export function TicketIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3.5 7.5h17V10a2 2 0 0 0 0 4v2.5h-17V14a2 2 0 0 0 0-4V7.5Z" fill={fill(props.accent)} />
      <path d="M14.5 8v1.5M14.5 11.25v1.5M14.5 14.5V16" />
    </Icon>
  );
}

export function VideoIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="2.5" y="6.5" width="13" height="11" rx="2.5" fill={fill(props.accent)} />
      <path d="m15.5 10.5 6-3.5v10l-6-3.5" />
    </Icon>
  );
}

export function TrophyIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M7 3.5h10v5a5 5 0 0 1-10 0v-5Z" fill={fill(props.accent)} />
      <path d="M7 5.5H4.5v1.5A3.5 3.5 0 0 0 8 10.5M17 5.5h2.5v1.5a3.5 3.5 0 0 1-3.5 3.5M12 13.5v3.5M8.5 20.5h7l-1-3.5h-5l-1 3.5Z" />
    </Icon>
  );
}

export function DumbbellIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="4.5" y="7" width="3.5" height="10" rx="1.2" fill={fill(props.accent)} />
      <rect x="16" y="7" width="3.5" height="10" rx="1.2" fill={fill(props.accent)} />
      <path d="M8 12h8M4.5 9.5H2.5v5h2M19.5 9.5h2v5h-2" />
    </Icon>
  );
}

export function PeopleIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="9" cy="8" r="3.2" fill={fill(props.accent)} />
      <path d="M3 19.5a6 6 0 0 1 12 0M15.5 4.9a3.2 3.2 0 0 1 0 6.2M17.5 13.9a6 6 0 0 1 3.5 5.6" />
    </Icon>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" fill={fill(props.accent)} />
      <path d="m8 12.3 2.7 2.7L16 9.7" />
    </Icon>
  );
}

// The icon for an inclusion as operators word it ("breakfast", "airport transfers"…).
const INCLUDED: [RegExp, (p: IconProps) => ReactNode][] = [
  [/accommodation|hotel|room|night|stay|villa/, BedIcon],
  [/meal|breakfast|lunch|dinner|board|food|drink/, MealIcon],
  [/transfer|airport|flight|transport/, PlaneIcon],
  [/coach|lesson|training|clinic|session/, ClinicIcon],
  [/court|fee|entry|ticket|pass/, TicketIcon],
  [/video|analysis|film/, VideoIcon],
  [/match|tournament|competition|social play/, TrophyIcon],
  [/gym|fitness|spa|wellness|pool/, DumbbellIcon],
  [/host|social|party|welcome|group/, PeopleIcon],
];

export function InclusionIcon({ item, ...props }: IconProps & { item: string }) {
  const lower = item.toLowerCase();
  const Match = INCLUDED.find(([re]) => re.test(lower))?.[1] ?? CheckIcon;
  return <Match {...props} />;
}

// --- plain line icons for labels -------------------------------------------------------------

export function CalendarIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </Icon>
  );
}

export function MoonIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10Z" />
    </Icon>
  );
}

export function PinIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </Icon>
  );
}

export function StoreIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 10v10.5h16V10M3 6.5 4.5 3.5h15L21 6.5v1a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0v-1ZM9.5 20.5v-5h5v5" />
    </Icon>
  );
}

export function ExternalIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M14 4.5h5.5V10M19.5 4.5 11 13M17 14v4a2.5 2.5 0 0 1-2.5 2.5h-8A2.5 2.5 0 0 1 4 18v-8a2.5 2.5 0 0 1 2.5-2.5h4" />
    </Icon>
  );
}
