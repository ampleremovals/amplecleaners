import crypto from "crypto";

/**
 * Generate a secure token for quote confirmation.
 * Format: `timestamp.hmac-sha256(bookingId:timestamp)`.
 * Returns null if QUOTE_CONFIRM_SECRET is not set (feature disabled).
 */
export function generateQuoteConfirmToken(bookingId: string): string | null {
  const secret = process.env.QUOTE_CONFIRM_SECRET;
  if (!secret) {
    console.warn("⚠️ QUOTE_CONFIRM_SECRET not set - quote confirmation disabled");
    return null;
  }
  const timestamp = Date.now();
  const payload = `${bookingId}:${timestamp}`;
  const hash = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return `${timestamp}.${hash}`;
}

/** Verify a quote confirmation token. False if invalid, expired, or secret missing. */
export function verifyQuoteConfirmToken(bookingId: string, token: string, expiryHours = 48): boolean {
  const secret = process.env.QUOTE_CONFIRM_SECRET;
  if (!secret) {
    console.warn("⚠️ QUOTE_CONFIRM_SECRET not set - cannot verify token, returning false");
    return false;
  }
  try {
    const [timestampStr, providedHash] = token.split(".");
    if (!timestampStr || !providedHash) return false;
    const timestamp = parseInt(timestampStr, 10);
    if (isNaN(timestamp)) return false;
    if (Date.now() - timestamp > expiryHours * 60 * 60 * 1000) return false;

    const payload = `${bookingId}:${timestamp}`;
    const expectedHash = crypto.createHmac("sha256", secret).update(payload).digest("hex");
    return crypto.timingSafeEqual(Buffer.from(providedHash, "hex"), Buffer.from(expectedHash, "hex"));
  } catch (error) {
    console.error("Token verification error:", error);
    return false;
  }
}

/**
 * Invoice link token — a non-expiring HMAC capability for `/pay/<invoiceId>/<token>`
 * and the PDF download. Unlike quote tokens it must outlive 48h/30d: an overdue
 * invoice link in someone's inbox has to keep working until it's paid.
 * Returns null if QUOTE_CONFIRM_SECRET is unset.
 */
export function generateInvoiceToken(invoiceId: string): string | null {
  const secret = process.env.QUOTE_CONFIRM_SECRET;
  if (!secret) return null;
  return crypto.createHmac("sha256", secret).update(`invoice:${invoiceId}`).digest("hex");
}

export function verifyInvoiceToken(invoiceId: string, token: string): boolean {
  const expected = generateInvoiceToken(invoiceId);
  if (!expected || !token) return false;
  try {
    const a = Buffer.from(token, "hex");
    const b = Buffer.from(expected, "hex");
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Booking "manage" link token — non-expiring HMAC capability for
 * `/manage/<bookingId>/<token>` (reschedule / cancel). Distinct payload prefix
 * from the invoice token so one can never be replayed as the other.
 */
export function generateBookingToken(bookingId: string): string | null {
  const secret = process.env.QUOTE_CONFIRM_SECRET;
  if (!secret) return null;
  return crypto.createHmac("sha256", secret).update(`booking:${bookingId}`).digest("hex");
}

export function verifyBookingToken(bookingId: string, token: string): boolean {
  const expected = generateBookingToken(bookingId);
  if (!expected || !token) return false;
  try {
    const a = Buffer.from(token, "hex");
    const b = Buffer.from(expected, "hex");
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
