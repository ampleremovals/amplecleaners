import { generateBookingToken, generateQuoteConfirmToken } from "@/lib/tokens";
import { SITE_URL } from "@/lib/email/config";

/** Customer-facing links used in email variables. Token links are null when the signing secret isn't configured. */
export const bookingLink = (serviceType: string) => `${SITE_URL}/booking/${serviceType}`;
export const regularLink = () => `${SITE_URL}/booking/regular_cleaning`;

export function quoteLink(bookingId: string): string | null {
  const t = generateQuoteConfirmToken(bookingId);
  return t ? `${SITE_URL}/quote/${bookingId}/${t}` : null;
}
export function rateLink(bookingId: string): string | null {
  const t = generateQuoteConfirmToken(bookingId);
  return t ? `${SITE_URL}/rate/${bookingId}/${t}` : null;
}
export function manageLink(bookingId: string): string | null {
  const t = generateBookingToken(bookingId);
  return t ? `${SITE_URL}/manage/${bookingId}/${t}` : null;
}
