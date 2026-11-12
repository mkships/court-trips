import type { NextConfig } from "next";
import sizes from "./src/lib/photo-sizes.json";

const photoBase = process.env.NEXT_PUBLIC_PHOTO_BASE_URL?.trim();

// Operator photos aren't in git (see scripts/seed.py), so a Vercel deploy can only show them
// from Blob. Fail the build loudly instead of shipping a site full of broken images.
if (process.env.VERCEL && !photoBase) {
  throw new Error(
    "NEXT_PUBLIC_PHOTO_BASE_URL is not set. Run `npm run photos:upload` locally, then add the URL it prints " +
      "to this Vercel project's environment variables (all environments) and redeploy.",
  );
}

// "List your program" in production needs a real bot check and someone to hear about submissions.
// Previews and local builds fall back to Turnstile's test keys and log the email instead.
if (process.env.VERCEL_ENV === "production") {
  const missing = ["NEXT_PUBLIC_TURNSTILE_SITE_KEY", "TURNSTILE_SECRET_KEY", "RESEND_API_KEY", "SUBMISSIONS_NOTIFY_TO"].filter(
    (name) => !process.env[name]?.trim(),
  );
  if (missing.length)
    throw new Error(`${missing.join(", ")} not set. See "Operator submissions" in the README, add them to Vercel (Production) and redeploy.`);
}

const nextConfig: NextConfig = {
  // The listing pages used to be one /search page with a type; keep old links and bookmarks working.
  async redirects() {
    const places = [{ type: "query" as const, key: "type", value: "places" }];
    return [
      { source: "/search", has: places, destination: "/resorts", permanent: true },
      { source: "/search", destination: "/trips", permanent: true },
      { source: "/", has: places, destination: "/resorts", permanent: true },
      { source: "/", has: [{ type: "query" as const, key: "sport" }], destination: "/trips", permanent: true },
    ];
  },
  experimental: {
    // photos are shrunk in the browser to fit (src/lib/submission.ts); Vercel's own cap is 4.5 MB
    serverActions: { bodySizeLimit: "4mb" },
  },
  images: {
    // Photos are pre-sized (scripts/photo-variants.mjs); the loader picks a size, so nothing is
    // resized on demand and a first visitor can't hit a cold resize.
    loader: "custom",
    loaderFile: "./src/lib/image-loader.ts",
    deviceSizes: sizes.widths,
    imageSizes: [],
  },
};

export default nextConfig;
