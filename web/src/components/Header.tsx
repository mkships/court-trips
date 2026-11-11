import Link from "next/link";
import { CurrencyPicker } from "@/components/Currency";
import { NavLinks } from "@/components/NavLinks";
import { BTN_OUTLINE } from "@/lib/ui";
import { Wordmark } from "./Wordmark";

// Wordmark, the four sections, then the currency and the way in for operators.
// On phones the sections drop to a second row that scrolls sideways if it has to.
export function Header() {
  return (
    <header className="mx-auto grid max-w-[1280px] grid-cols-[1fr_auto] items-center gap-x-6 gap-y-2 px-4 pt-5 pb-3 sm:px-8 lg:grid-cols-[1fr_auto_1fr] lg:pb-5">
      <Link href="/" className="col-start-1 row-start-1 justify-self-start">
        <Wordmark className="h-[26px] w-auto" />
      </Link>
      <nav
        aria-label="Sections"
        className="col-span-2 row-start-2 -mx-4 flex gap-0.5 overflow-x-auto px-1 [scrollbar-width:none] sm:-ml-3.5 sm:px-0 lg:col-span-1 lg:col-start-2 lg:row-start-1 lg:mx-0 [&::-webkit-scrollbar]:hidden"
      >
        <NavLinks />
      </nav>
      <div className="col-start-2 row-start-1 flex items-center gap-2 justify-self-end lg:col-start-3">
        <CurrencyPicker />
        {/* travellers don't need accounts; this is the way in for operators (also in the footer) */}
        <Link href="/for-operators" className={`hidden px-4 py-2 text-[0.9375rem] whitespace-nowrap sm:inline-flex ${BTN_OUTLINE}`}>
          List your program
        </Link>
      </div>
    </header>
  );
}
