import crypto from "crypto";
import { SITE_URL } from "@/lib/email/config";

/**
 * Unsubscribe link token: `base64url(email).hmac`. Non-expiring (an old email must still work), and the
 * payload prefix differs from every other token in the app so none can be replayed as another.
 */
const secret = () => process.env.QUOTE_CONFIRM_SECRET ?? "";
const sign = (email: string) => crypto.createHmac("sha256", secret()).update(`unsubscribe:${email}`).digest("hex");

export function unsubscribeToken(email: string): string | null {
  if (!secret()) return null;
  const e = email.trim().toLowerCase();
  return `${Buffer.from(e, "utf8").toString("base64url")}.${sign(e)}`;
}

/** The email address a valid token belongs to, else null. */
export function verifyUnsubscribeToken(token: string): string | null {
  if (!secret()) return null;
  const [enc, sig] = token.split(".");
  if (!enc || !sig) return null;
  try {
    const email = Buffer.from(enc, "base64url").toString("utf8");
    const a = Buffer.from(sig, "hex");
    const b = Buffer.from(sign(email), "hex");
    return a.length === b.length && crypto.timingSafeEqual(a, b) ? email : null;
  } catch {
    return null;
  }
}

export function unsubscribeUrl(email: string): string | null {
  const t = unsubscribeToken(email);
  return t ? `${SITE_URL}/unsubscribe/${t}` : null;
}

/** The endpoint mail clients POST to for one-click unsubscribe (RFC 8058). */
export function oneClickUnsubscribeUrl(email: string): string | null {
  const t = unsubscribeToken(email);
  return t ? `${SITE_URL}/api/unsubscribe/${t}` : null;
}
