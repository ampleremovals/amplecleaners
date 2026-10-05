import type { MetadataRoute } from "next";
import { AREAS } from "@/lib/seo/areas";
import { GUIDES } from "@/lib/seo/guides";
import { POSTS, POST_CATEGORIES } from "@/lib/seo/posts";
import { SEO_SERVICES } from "@/lib/seo/services";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.amplecleaners.com";

export default function sitemap(): MetadataRoute.Sitemap {
  // Fixed date: a "modified" stamp that changes on every build tells search engines nothing. Bump it when page content really changes.
  const now = new Date("2026-10-05");
  return [
    { url: SITE, lastModified: now, changeFrequency: "weekly", priority: 1 },
    // Service hubs and every service × area page.
    ...SEO_SERVICES.map((s) => ({ url: `${SITE}/${s.slug}`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.8 })),
    ...SEO_SERVICES.flatMap((s) => AREAS.map((a) => ({ url: `${SITE}/${s.slug}/${a.slug}`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.6 }))),
    { url: `${SITE}/blog`, lastModified: new Date(POSTS[0].published), changeFrequency: "weekly", priority: 0.7 },
    ...POSTS.map((p) => ({ url: `${SITE}/blog/${p.slug}`, lastModified: new Date(p.published), changeFrequency: "monthly" as const, priority: 0.6 })),
    ...(Object.keys(POST_CATEGORIES) as (keyof typeof POST_CATEGORIES)[]).filter((c) => POSTS.some((p) => p.category === c)).map((c) => ({ url: `${SITE}/blog/category/${c}`, lastModified: new Date(POSTS[0].published), changeFrequency: "weekly" as const, priority: 0.4 })),
    { url: `${SITE}/guides`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    ...GUIDES.map((g) => ({ url: `${SITE}/guides/${g.slug}`, lastModified: new Date(g.published), changeFrequency: "monthly" as const, priority: 0.7 })),
    { url: `${SITE}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE}/cleaners/register`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];
}
