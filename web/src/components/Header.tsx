import Link from "next/link";
import { CurrencyPicker } from "@/components/Currency";
import { HeaderNav } from "@/components/NavLinks";
import { getHomeData } from "@/lib/db";
import { tripsMenu } from "@/lib/landing";
import { BTN_OUTLINE, PAGE } from "@/lib/ui";
import { Logo } from "./Logo";
import { Wordmark } from "./Wordmark";

// The logo (wordmark alone on phones, to keep the header compact), the four sections, then the
// currency and the way in for operators.
// On phones the sections drop to a second row that scrolls sideways if it has to. Trips opens a menu
// of the sport, format and country pages (src/lib/landing.ts), which hangs under the whole header.
export async function Header() {
  const { listings } = await getHomeData();
  return (
    <header className={`${PAGE} relative grid grid-cols-[1fr_auto] items-center gap-x-6 gap-y-2 pt-5 pb-3 lg:grid-cols-[1fr_auto_1fr] lg:pb-5`}>
      <Link href="/" className="col-start-1 row-start-1 justify-self-start">
        <Wordmark className="h-[26px] w-auto sm:hidden" />
        <Logo className="hidden w-[200px] sm:block" />
      </Link>
      <HeaderNav menu={tripsMenu(listings)} />
      <div className="col-start-2 row-start-1 flex items-center gap-2 justify-self-end lg:col-start-3">
        <CurrencyPicker />
        {/* travellers don't need accounts; this is the way in for operators (also in the footer) */}
        <Link href="/for-operators" className={`px-4 py-2 text-[0.9375rem] whitespace-nowrap max-sm:hidden ${BTN_OUTLINE}`}>
          List your program
        </Link>
      </div>
    </header>
  );
}
