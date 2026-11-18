import type { Metadata } from "next";
import Link from "next/link";
import { H1 } from "@/components/Browse";
import { subscriberByToken } from "@/lib/newsletter";
import { LINK } from "@/lib/ui";
import { UnsubscribeButton } from "./UnsubscribeButton";

export const metadata: Metadata = { title: "Unsubscribe | Court Trips", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const subscriber = await subscriberByToken(token);

  return (
    <main className="mx-auto max-w-[720px] px-4 sm:px-8">
      {!subscriber || !token ? (
        <>
          <h1 className={`mt-6 ${H1}`}>This link doesn&apos;t work</h1>
          <p className="mt-4 max-w-[52ch] text-[1.0625rem] leading-relaxed text-ink-soft">
            It may have been cut short by your email app. Copy the whole link from the email into your browser, or reply
            to any of our emails and we&apos;ll take you off the list.
          </p>
        </>
      ) : subscriber.status === "unsubscribed" ? (
        <>
          <h1 className={`mt-6 ${H1}`}>You&apos;re unsubscribed</h1>
          <p className="mt-4 max-w-[52ch] text-[1.0625rem] leading-relaxed text-ink-soft">
            You won&apos;t get any more emails from us. Changed your mind?{" "}
            <Link href="/newsletter" className={`text-ink ${LINK}`}>
              Sign up again
            </Link>
            .
          </p>
        </>
      ) : (
        <UnsubscribeButton token={token} />
      )}
    </main>
  );
}
