/**
 * Customer/admin notifications with failure VISIBILITY.
 *
 * The Resend SDK resolves `{ data, error }` instead of throwing, so the older
 * `.catch()` call sites silently swallowed e.g. "domain not verified". Every
 * send here checks `error` and writes a `server_logs` row, while still never
 * failing the booking flow (CLAUDE.md: messaging failures must not fail the
 * request — log and continue).
 */
import { resend, resendFrom, OUTBOUND_DISABLED } from "@/lib/resend";
import { sendSMS, sendWhatsApp, type SendResult } from "@/lib/twilio";
import { createAdminClient } from "@/lib/supabase/server";
import { logError } from "@/lib/log-error";

export async function sendEmailSafe(params: {
  to: string;
  subject: string;
  html: string;
  context: string;
}): Promise<boolean> {
  if (OUTBOUND_DISABLED) return true;
  try {
    const { error } = await resend.emails.send({ from: resendFrom, to: params.to, subject: params.subject, html: params.html });
    if (error) throw new Error(error.message);
    return true;
  } catch (e) {
    await logError({ message: `email failed: ${params.context}`, metadata: { to: params.to, error: String(e) }, level: "warn" });
    return false;
  }
}

/** The admin's SMS/WhatsApp on-off switches (Settings). Defaults to ON if the row can't be read. */
async function channelSwitches(): Promise<{ sms: boolean; whatsapp: boolean }> {
  try {
    const { data } = await createAdminClient().from("settings").select("customer_sms_enabled, customer_whatsapp_enabled").eq("id", 1).maybeSingle();
    return { sms: data?.customer_sms_enabled !== false, whatsapp: data?.customer_whatsapp_enabled !== false };
  } catch {
    return { sms: true, whatsapp: true };
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
  const { sms: smsOn, whatsapp: whatsappOn } = OUTBOUND_DISABLED ? { sms: false, whatsapp: false } : await channelSwitches();
  const skipped: SendResult = { success: false, skipped: true };
  const [email, sms, whatsapp] = await Promise.all([
    sendEmailSafe({ to: m.email, subject: m.subject, html: m.html, context: m.context }),
    smsOn ? sendSMS(m.phone, m.sms) : skipped,
    whatsappOn ? sendWhatsApp(m.phone, m.whatsapp) : skipped,
  ]);
  // `skipped` means Twilio isn't configured yet — expected, not an error.
  for (const [channel, r] of [["sms", sms], ["whatsapp", whatsapp]] as const) {
    if (!r.success && !r.skipped) {
      await logError({ message: `${channel} failed: ${m.context}`, metadata: { to: m.phone, error: r.error }, level: "warn" });
    }
  }
  void email;
}
