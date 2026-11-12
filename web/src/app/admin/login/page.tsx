import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { signInSetupMissing } from "@/lib/admin/auth";
import { readSession, SESSION_COOKIE } from "@/lib/admin/session";
import { BTN_DARK, BTN_OUTLINE } from "@/lib/ui";

const ERRORS: Record<string, string> = {
  denied: "That GitHub account isn't the admin account.",
  expired: "The sign-in took too long or was started in another tab. Try again.",
  github: "GitHub didn't answer as expected. Try again in a minute.",
  setup: "GitHub sign-in isn't set up on this deployment yet.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await readSession((await cookies()).get(SESSION_COOKIE)?.value)) redirect("/admin");
  const { error } = await searchParams;
  const missing = signInSetupMissing();
  const dev = process.env.NODE_ENV === "development";

  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-[420px] rounded-3xl bg-white p-8 shadow-card">
        <p className="text-[1.375rem] font-black tracking-[-0.03em]">Court Trips admin</p>
        <p className="mt-1 text-ink-soft">Review submissions and drafts, and edit listings.</p>
        {error && ERRORS[error] && (
          <p role="alert" className="mt-5 rounded-xl border border-alert/40 bg-alert/5 px-4 py-3 text-[0.9375rem] text-alert">
            {ERRORS[error]}
          </p>
        )}
        {missing.length === 0 ? (
          <a href="/admin/auth/github" className={`mt-6 w-full px-5 py-3 ${BTN_DARK}`}>
            <svg viewBox="0 0 16 16" className="size-5" fill="currentColor" aria-hidden="true">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38v-1.33c-2.23.48-2.7-1.07-2.7-1.07-.36-.92-.89-1.17-.89-1.17-.73-.5.06-.49.06-.49.8.06 1.23.83 1.23.83.72 1.22 1.88.87 2.34.66.07-.52.28-.87.5-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48v2.2c0 .21.15.46.55.38A8 8 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
            </svg>
            Sign in with GitHub
          </a>
        ) : (
          <div className="mt-6 rounded-xl bg-mist p-4 text-[0.9375rem]">
            <p className="font-semibold">GitHub sign-in needs these settings:</p>
            <ul className="mt-2 list-disc pl-5 text-ink-soft">
              {missing.map((m) => (
                <li key={m}>
                  <code>{m}</code>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-ink-soft">See &ldquo;Admin&rdquo; in the README.</p>
          </div>
        )}
        {dev && (
          <a href="/admin/auth/dev" className={`mt-3 w-full px-5 py-3 ${BTN_OUTLINE}`}>
            Continue without GitHub (local development only)
          </a>
        )}
      </div>
    </main>
  );
}
