import type { MetadataRoute } from "next";
import { SERVICE_LABELS } from "@/types";
import { AREAS } from "@/lib/seo/areas";
import { SEO_SERVICES } from "@/lib/seo/services";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.amplecleaners.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: SITE, lastModified: now, changeFrequency: "weekly", priority: 1 },
    ...Object.keys(SERVICE_LABELS).map((service) => ({
      url: `${SITE}/booking/${service}`, lastModified: now, changeFrequency: "monthly" as const, priority: service === "regular_cleaning" ? 0.9 : 0.7,
    })),
    // Service hubs and every service × area page.
    ...SEO_SERVICES.map((s) => ({ url: `${SITE}/${s.slug}`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.8 })),
    ...SEO_SERVICES.flatMap((s) => AREAS.map((a) => ({ url: `${SITE}/${s.slug}/${a.slug}`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.6 }))),
    { url: `${SITE}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE}/cleaners/register`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];
}
