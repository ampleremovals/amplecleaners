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
