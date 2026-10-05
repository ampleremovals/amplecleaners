import { createAdminClient } from "@/lib/supabase/server";
import { DEFAULT_PRICING, type PricingConfig } from "@/lib/pricing";

const TTL_MS = 30_000;
let cache: { value: PricingConfig; at: number } | null = null;

/** Live pricing from the settings row (30s in-process cache), falling back to the defaults. Server only. */
export async function getPricing(): Promise<PricingConfig> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value;
  try {
    const { data } = await createAdminClient().from("settings").select("hourly_rate, min_hours, deposit_percentage").eq("id", 1).maybeSingle();
    const value: PricingConfig = data
      ? {
          hourlyRate: Number(data.hourly_rate) || DEFAULT_PRICING.hourlyRate,
          minHours: Number(data.min_hours) || DEFAULT_PRICING.minHours,
          depositPercentage: Number(data.deposit_percentage) || DEFAULT_PRICING.depositPercentage,
        }
      : DEFAULT_PRICING;
    cache = { value, at: Date.now() };
    return value;
  } catch {
    return DEFAULT_PRICING;
  }
}

/** Drop the cache right after the admin saves new pricing so the next request sees it. */
export function clearPricingCache(): void {
  cache = null;
}

export const MIN_REVIEWS_TO_SHOW = 5;

/** Average customer rating, or null until there are enough REAL reviews to be meaningful (never fabricated). */
export async function getPublicRating(): Promise<{ average: number; count: number } | null> {
  try {
    const { data } = await createAdminClient().from("ratings").select("rating");
    if (!data || data.length < MIN_REVIEWS_TO_SHOW) return null;
    const average = data.reduce((s, r) => s + Number(r.rating), 0) / data.length;
    return { average: Math.round(average * 10) / 10, count: data.length };
  } catch {
    return null;
  }
}
