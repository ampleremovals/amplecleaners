import { generateBookingToken } from "@/lib/tokens";

/** The customer's self-service page for a booking, or null if no signing secret is configured. */
export function manageUrl(bookingId: string): string | null {
  const token = generateBookingToken(bookingId);
  return token ? `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/manage/${bookingId}/${token}` : null;
}
