/**
 * Regular Cleaning is priced by the hour, with a minimum booking length —
 * the only service with a deterministic, advertised rate (the other 4 are
 * quoted individually by the admin, since they vary too much by property).
 */
export const REGULAR_CLEANING_HOURLY_RATE = 15; // £ per hour
export const REGULAR_CLEANING_MIN_HOURS = 3;

export function regularCleaningPrice(hours: number): number {
  const h = Math.max(REGULAR_CLEANING_MIN_HOURS, Number(hours) || REGULAR_CLEANING_MIN_HOURS);
  return Math.round(h * REGULAR_CLEANING_HOURLY_RATE * 100) / 100;
}
