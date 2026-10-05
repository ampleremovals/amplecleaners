import type { MetadataRoute } from "next";
import { SERVICE_LABELS } from "@/types";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.amplecleaners.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: SITE, lastModified: now, changeFrequency: "weekly", priority: 1 },
    ...Object.keys(SERVICE_LABELS).map((service) => ({
      url: `${SITE}/booking/${service}`, lastModified: now, changeFrequency: "monthly" as const, priority: service === "regular_cleaning" ? 0.9 : 0.7,
    })),
    { url: `${SITE}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE}/cleaners/register`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];
}
