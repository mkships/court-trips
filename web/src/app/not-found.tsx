import Link from "next/link";
import { BTN_PRIMARY } from "@/lib/ui";
import { Court } from "@/components/Court";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { SURFACES } from "@/lib/surfaces";

export default function NotFound() {
  return (
    <div className="on-paper">
      <Header />
      <main className="mx-auto max-w-[1280px] px-4 sm:px-8">
        <div className="relative flex h-[300px] items-center justify-center rounded-3xl md:h-[380px]" style={{ backgroundColor: SURFACES.tennis.surround }}>
          <Court sport="tennis" className="h-[72%] w-full max-w-[620px]" />
          {/* the ball that landed out */}
          <span aria-hidden="true" className="absolute right-[12%] bottom-[14%] size-4 rounded-full bg-ball shadow-[0_0_0_3px_rgba(0,0,0,0.12)]" />
        </div>
        <h1 className="mt-10 text-[2.25rem] leading-[1] font-black tracking-[-0.035em] sm:text-[3rem]">
          That one&apos;s out
        </h1>
        <p className="mt-3 max-w-[50ch] text-[1.0625rem] text-ink-soft">
          The page has moved, or the trip isn&apos;t listed any more.
        </p>
        <Link href="/trips" className={`mt-7 h-14 px-7 ${BTN_PRIMARY}`}>
          Back to all trips
        </Link>
      </main>
      <Footer />
    </div>
  );
}
