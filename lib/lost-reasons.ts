/** Quick reasons offered when a lead is moved to Lost. Stored on the booking and counted in Automations → Results. */
export const LOST_REASONS = ["Too expensive", "Chose someone else", "No longer needed", "Wrong area", "Couldn't reach them", "Not a fit for us", "Other"] as const;
export type LostReason = (typeof LOST_REASONS)[number];
