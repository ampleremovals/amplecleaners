/**
 * Customer/admin notifications with failure VISIBILITY.
 *
 * The Resend SDK resolves `{ data, error }` instead of throwing, so the older
 * `.catch()` call sites silently swallowed e.g. "domain not verified". Every
 * send here checks `error` and writes a `server_logs` row, while still never
 * failing the booking flow (CLAUDE.md: messaging failures must not fail the
 * request — log and continue).
 */
import { resend, resendFrom } from "@/lib/resend";
import { sendSMS, sendWhatsApp } from "@/lib/twilio";
import { logError } from "@/lib/log-error";

export async function sendEmailSafe(params: {
  to: string;
  subject: string;
  html: string;
  context: string;
}): Promise<boolean> {
  try {
    const { error } = await resend.emails.send({ from: resendFrom, to: params.to, subject: params.subject, html: params.html });
    if (error) throw new Error(error.message);
    return true;
  } catch (e) {
    await logError({ message: `email failed: ${params.context}`, metadata: { to: params.to, error: String(e) }, level: "warn" });
    return false;
  }
}

export interface CustomerMessage {
  context: string;
  email: string;
  phone: string;
  subject: string;
  html: string;
  sms: string;
  whatsapp: string;
}

/** "Send a message" = email + SMS + WhatsApp, all three, independently. */
export async function notifyCustomer(m: CustomerMessage): Promise<void> {
  const [email, sms, whatsapp] = await Promise.all([
    sendEmailSafe({ to: m.email, subject: m.subject, html: m.html, context: m.context }),
    sendSMS(m.phone, m.sms),
    sendWhatsApp(m.phone, m.whatsapp),
  ]);
  // `skipped` means Twilio isn't configured yet — expected, not an error.
  for (const [channel, r] of [["sms", sms], ["whatsapp", whatsapp]] as const) {
    if (!r.success && !r.skipped) {
      await logError({ message: `${channel} failed: ${m.context}`, metadata: { to: m.phone, error: r.error }, level: "warn" });
    }
  }
  void email;
}
