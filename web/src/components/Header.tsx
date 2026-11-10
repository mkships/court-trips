import Link from "next/link";
import type { Mode } from "@/lib/sports";
import { BTN_OUTLINE } from "@/lib/ui";
import { Wordmark } from "./Wordmark";

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
        className="col-start-1 row-start-1 justify-self-start"
      >
        <Wordmark className="h-[26px] w-auto" />
      </Link>
      <nav aria-label="What to browse" className="col-span-2 row-start-2 -ml-4 flex gap-1 md:col-span-1 md:col-start-2 md:row-start-1 md:ml-0">
        {MODES.map(([value, label]) =>
          onModeChange ? (
            <button
              key={value}
              type="button"
              aria-pressed={mode === value}
              onClick={() => onModeChange(value)}
              className="px-4 py-2 text-[0.9375rem] font-semibold text-ink-soft underline decoration-transparent decoration-2 underline-offset-[10px] transition-colors hover:text-ink hover:decoration-ink/25 aria-pressed:text-ink aria-pressed:decoration-ink"
            >
              {label}
            </button>
          ) : (
            <Link
              key={value}
              href={value === "places" ? "/?type=places" : "/"}
              aria-current={mode === value ? "page" : undefined}
              className="px-4 py-2 text-[0.9375rem] font-semibold text-ink-soft underline decoration-transparent decoration-2 underline-offset-[10px] transition-colors hover:text-ink hover:decoration-ink/25 aria-[current=page]:text-ink aria-[current=page]:decoration-ink"
            >
              {label}
            </Link>
          ),
        )}
      </nav>
      {/* travellers don't need accounts; this is the only way in for operators */}
      <Link
        href="/list-your-program"
        className={`col-start-2 row-start-1 justify-self-end px-4 py-2 text-[0.9375rem] md:col-start-3 ${BTN_OUTLINE}`}
      >
        List your program
      </Link>
    </header>
  );
}
