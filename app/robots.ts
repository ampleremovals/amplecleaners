import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.amplecleaners.com";

/** Only the marketing pages are crawlable — never admin, API, or tokenised customer links. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/quote/", "/pay/", "/rate/", "/manage/", "/cleaners/dashboard", "/cleaners/reset-password"] }],
    sitemap: `${SITE}/sitemap.xml`,
  };
}
