/**
 * Regular Cleaning is priced by the hour with a minimum booking length — the
 * only service with a deterministic, advertised rate (the other four are
 * quoted individually). The LIVE values come from Settings (see
 * lib/pricing-config.ts); these are the defaults used if settings can't be read.
 */
export interface PricingConfig {
  hourlyRate: number;
  minHours: number;
  /** Deposit % for NEW bookings; every booking stamps its own copy (Lesson 18). */
  depositPercentage: number;
}

export const DEFAULT_PRICING: PricingConfig = { hourlyRate: 15, minHours: 3, depositPercentage: 20 };

export function regularCleaningPrice(hours: number, cfg: PricingConfig = DEFAULT_PRICING): number {
  const h = Math.max(cfg.minHours, Number(hours) || cfg.minHours);
  return Math.round(h * cfg.hourlyRate * 100) / 100;
}
