import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { ListingForm } from "@/components/submit/ListingForm";
import { TURNSTILE_ACTION, turnstileSiteKey } from "@/lib/turnstile";

export const metadata: Metadata = {
  title: "List your program | Court Trips",
  description: "Run a tennis, pickleball or padel camp, clinic or getaway? Add it to Court Trips for free.",
};

export default function ListYourProgramPage() {
  return (
    <div className="on-paper">
      <Header />
      <main className="mx-auto max-w-[880px] px-4 sm:px-8">
        <h1 className="mt-6 max-w-[20ch] text-[2.25rem] leading-[1] font-black tracking-[-0.035em] text-balance sm:text-[3rem]">
          List your program on Court Trips
        </h1>
        <p className="mt-4 max-w-[60ch] text-[1.0625rem] leading-relaxed text-ink-soft">
          Camps, clinics and getaways for tennis, pickleball and padel. Listing is free, and players book with you directly:
          we link to your booking page and don&apos;t take a cut. We check each listing before it goes live.
        </p>
        <ListingForm siteKey={turnstileSiteKey()} turnstileAction={TURNSTILE_ACTION} />
      </main>
      <Footer />
    </div>
  );
}
