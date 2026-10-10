import { Resend } from "resend";
import { recordDirectSend } from "@/lib/email/outbox";
import { suppressionFor } from "@/lib/email/suppression";

// The Resend SDK's constructor throws immediately if the key is missing/empty
// (not just when you try to send) — which breaks `next build`'s page-data
// collection step before any real env vars exist for this project. A
// placeholder key satisfies the constructor; actual sends fail gracefully
// (caught by every call site here) until the real key is set.
export const resend = new Resend(process.env.RESEND_API_KEY || "re_placeholder_not_configured");

export const resendFrom =
  process.env.RESEND_FROM_EMAIL ?? "Bookings - Ample Cleaners <bookings@amplecleaners.com>";

export const resendAdminEmail =
  process.env.RESEND_ADMIN_EMAIL ?? "admin@amplecleaners.com";

/**
 * Send an email using Resend. Thin wrapper kept separate from the raw SDK so
 * call sites don't need to know the default "from" address.
 */
/**
 * Kill switch for automated tests: with `DISABLE_OUTBOUND_MESSAGES=1` no email, SMS or
 * WhatsApp leaves the app. (Test runs once exhausted the real daily email quota.)
 * Never set this in production.
 */
export const OUTBOUND_DISABLED = process.env.DISABLE_OUTBOUND_MESSAGES === "1";

export async function sendEmail(params: {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  /** What this email is, for the Send log (e.g. "quote follow-up day 3"). */
  context?: string;
}) {
  const { to, subject, html, from = resendFrom, context = "system email" } = params;
  if (OUTBOUND_DISABLED) return { data: { id: "disabled" }, error: null };
  // An address that hard-bounced or reported us as spam is never emailed again: it damages delivery for everyone.
  if (typeof to === "string" && (await suppressionFor(to)) === "all") {
    await recordDirectSend({ to, subject, context, error: "not sent: address bounced or complained before" });
    return { data: null, error: { name: "suppressed", message: "address is suppressed" } };
  }
  const res = await resend.emails.send({ from, to, subject, html });
  await recordDirectSend({ to, subject, context, resendId: res.data?.id, error: res.error?.message });
  return res;
}
