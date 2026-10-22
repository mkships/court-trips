import Link from "next/link";
import type { Mode } from "@/lib/sports";

const MODES: [Mode, string][] = [
  ["programs", "Programs"],
  ["places", "Places to stay"],
];

// On the homepage the tabs switch mode in place; elsewhere they link back to it.
export function Header({
  mode,
  onModeChange,
}: {
  mode?: Mode;
  onModeChange?: (mode: Mode) => void;
}) {
  return (
    <header className="mx-auto grid max-w-[1280px] grid-cols-[1fr_auto] items-center gap-x-6 gap-y-2 px-4 pt-5 pb-3 sm:px-8 md:grid-cols-[1fr_auto_1fr] md:pb-5">
      <Link
        href="/"
        className="col-start-1 row-start-1 flex items-center gap-2 justify-self-start text-[1.375rem] font-black tracking-[-0.03em]"
      >
        <Logo />
        Court Trips
      </Link>
      <nav aria-label="What to browse" className="col-span-2 row-start-2 -ml-4 flex gap-1 md:col-span-1 md:col-start-2 md:row-start-1 md:ml-0">
        {MODES.map(([value, label]) =>
          onModeChange ? (
            <button
              key={value}
              type="button"
              aria-pressed={mode === value}
              onClick={() => onModeChange(value)}
              className="rounded-full px-4 py-2 text-[0.9375rem] font-semibold text-ink-soft hover:bg-rule/60 aria-pressed:text-ink aria-pressed:underline aria-pressed:decoration-2 aria-pressed:underline-offset-[10px]"
            >
              {label}
            </button>
          ) : (
            <Link
              key={value}
              href={value === "places" ? "/?type=places" : "/"}
              className="rounded-full px-4 py-2 text-[0.9375rem] font-semibold text-ink-soft hover:bg-rule/60 hover:text-ink"
            >
              {label}
            </Link>
          ),
        )}
      </nav>
      {/* "List your program" returns here once operator listings are built; travellers don't need accounts. */}
    </header>
  );
}

function Logo() {
  return (
    <svg viewBox="0 0 28 18" className="h-[18px] w-7" aria-hidden="true">
      <rect x="1" y="1" width="26" height="16" rx="2" fill="#2d5d8c" />
      <path
        d="M14 1v16M7 4v10M21 4v10M7 9h14"
        stroke="#fff"
        strokeWidth="1.4"
        fill="none"
      />
    </svg>
  );
}
