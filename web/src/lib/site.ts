// The site's own address: NEXT_PUBLIC_SITE_URL once the site has a domain, else Vercel's
// production address, else local. Blank values count as unset. Link previews, canonical URLs,
// the sitemap and robots.txt all build absolute URLs from this.
export function siteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return new URL(configured);
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  return new URL(vercel ? `https://${vercel}` : "http://localhost:3000");
}
