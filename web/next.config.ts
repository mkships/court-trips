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

const nextConfig: NextConfig = {
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
