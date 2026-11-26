import type { MetadataRoute } from "next";

// What a phone uses when someone saves the site to their home screen: the name and the icons
// (brand/first-light/app-icons). "browser" keeps the address bar: this is a directory that sends
// people on to operators' own sites, so it shouldn't open like a sealed app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Court Trips",
    short_name: "Court Trips",
    description: "Tennis, pickleball and padel camps, clinics and getaways worldwide.",
    start_url: "/",
    display: "browser",
    background_color: "#faf8f1",
    theme_color: "#3a6e52",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // extra margin around the emblem, for Android's shaped icon masks
      { src: "/icons/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
