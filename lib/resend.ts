import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY);

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
