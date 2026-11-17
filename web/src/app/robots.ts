import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

// Everything public is crawlable; the admin and the outbound /go hops are not pages.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/go/"] },
    sitemap: new URL("/sitemap.xml", siteUrl()).toString(),
  };
}
