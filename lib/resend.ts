import { Resend } from "resend";

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
export async function sendEmail(params: {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}) {
  const { to, subject, html, from = resendFrom } = params;
  return await resend.emails.send({ from, to, subject, html });
}
