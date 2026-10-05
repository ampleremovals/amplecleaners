"use client";

import { createContext, useContext, useMemo } from "react";
import { DEFAULT_PRICING, regularCleaningPrice, type PricingConfig } from "@/lib/pricing";

interface PublicSiteData {
  pricing: PricingConfig;
  rating: { average: number; count: number } | null;
}

const Ctx = createContext<PublicSiteData>({ pricing: DEFAULT_PRICING, rating: null });

/** Hands the live (server-fetched) pricing and review summary to client pages, so they render the right numbers on first paint. */
export function PricingProvider({ value, children }: { value: PublicSiteData; children: React.ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePricing() {
  const { pricing, rating } = useContext(Ctx);
  return useMemo(() => ({ ...pricing, rating, price: (hours: number) => regularCleaningPrice(hours, pricing) }), [pricing, rating]);
}
