import type { Metadata } from "next";
import Link from "next/link";
import { H1 } from "@/components/Browse";
import { subscriberByToken } from "@/lib/newsletter";
import { LINK } from "@/lib/ui";
import { ConfirmPanel } from "./ConfirmPanel";

export const metadata: Metadata = { title: "Confirm your email | Court Trips", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function ConfirmPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const subscriber = await subscriberByToken(token);

  return (
    <main className="mx-auto max-w-[720px] px-4 sm:px-8">
      {subscriber && token ? (
        <ConfirmPanel token={token} confirmed={subscriber.status === "confirmed"} sports={subscriber.sports} />
      ) : (
        <>
          <h1 className={`mt-6 ${H1}`}>This link doesn&apos;t work</h1>
          <p className="mt-4 max-w-[52ch] text-[1.0625rem] leading-relaxed text-ink-soft">
            It may have been cut short by your email app. Copy the whole link from the email into your browser, or{" "}
            <Link href="/newsletter" className={`text-ink ${LINK}`}>
              sign up again
            </Link>
            .
          </p>
        </>
      )}
    </main>
  );
}
