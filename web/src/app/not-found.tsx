import Link from "next/link";
import { Court } from "@/components/Court";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { SURFACES } from "@/lib/surfaces";

export default function NotFound() {
  return (
    <div className="on-paper">
      <Header />
      <main className="mx-auto max-w-[1280px] px-4 sm:px-8">
        <div className="relative flex h-[300px] items-center justify-center rounded-[28px] md:h-[380px]" style={{ backgroundColor: SURFACES.tennis.surround }}>
          <Court sport="tennis" className="h-[72%] w-full max-w-[620px]" />
          {/* the ball that landed out */}
          <span aria-hidden="true" className="absolute right-[12%] bottom-[14%] size-4 rounded-full bg-ball shadow-[0_0_0_3px_rgba(0,0,0,0.12)]" />
        </div>
        <h1 className="mt-10 text-[2.25rem] leading-[1] font-black tracking-[-0.035em] sm:text-[3rem]">
          We can&apos;t find that page
        </h1>
        <p className="mt-3 max-w-[50ch] text-[1.0625rem] text-ink-soft">
          It may have moved, or the trip is no longer listed.
        </p>
        <Link href="/" className="mt-7 inline-flex h-14 items-center rounded-full bg-ball px-7 font-extrabold text-ink hover:brightness-95">
          Back to all trips
        </Link>
      </main>
      <Footer />
    </div>
  );
}
