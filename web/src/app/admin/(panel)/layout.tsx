import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { queueCounts } from "@/lib/admin/queries";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();
  const counts = await queueCounts();
  const nav = [
    ["/admin", "Review queue", counts.total],
    ["/admin/programs", "Programs", null],
    ["/admin/venues", "Venues", null],
  ] as const;

  return (
    <>
      <header className="border-b border-rule bg-white">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-8">
          <Link href="/admin" className="text-[1.125rem] font-black tracking-[-0.03em]">
            Court Trips <span className="font-semibold text-ink-soft">admin</span>
          </Link>
          <nav aria-label="Admin" className="flex flex-wrap gap-1">
            {nav.map(([href, label, count]) => (
              <Link key={href} href={href} className="rounded-full px-3.5 py-1.5 text-[0.9375rem] font-semibold transition-colors hover:bg-mist">
                {label}
                {count ? <span className="ml-1.5 rounded-full bg-ball px-2 py-0.5 text-[0.75rem] font-extrabold">{count}</span> : null}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-[0.875rem]">
            <Link href="/" className="font-semibold text-ink-soft hover:text-ink">
              View site
            </Link>
            <span className="text-ink-soft">{session.login}</span>
            <form action="/admin/logout" method="post">
              <button type="submit" className="rounded-full border border-rule px-3 py-1 font-semibold transition-colors hover:border-ink hover:bg-mist">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1200px] px-4 py-8 sm:px-8">{children}</main>
    </>
  );
}
