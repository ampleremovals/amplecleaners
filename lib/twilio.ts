import twilio from "twilio";

/**
 * Twilio client. Prefers API Key auth (TWILIO_API_KEY_SID + _SECRET, the
 * recommended/revocable credentials) and falls back to the account Auth
 * Token. Guarded so builds/dev don't crash when credentials are still
 * placeholders.
 *
 * Required env: TWILIO_ACCOUNT_SID (AC…) plus EITHER
 *   • TWILIO_API_KEY_SID (SK…) + TWILIO_API_KEY_SECRET   (recommended), OR
 *   • TWILIO_AUTH_TOKEN
 *
 * NOTE: WhatsApp freeform messages only work inside Twilio's 24h customer
 * session window, or via an approved WhatsApp message template outside it.
 * This starter sends freeform only — register approved templates with Twilio
 * once the WhatsApp Business profile is live, the same way Ample Removals did
 * (see lib/whatsapp-templates.ts there for the pattern to follow).
 */
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const apiKeySid = process.env.TWILIO_API_KEY_SID;
const apiKeySecret = process.env.TWILIO_API_KEY_SECRET;

export const twilioClient =
  accountSid && accountSid.startsWith("AC") && apiKeySid?.startsWith("SK") && apiKeySecret
    ? twilio(apiKeySid, apiKeySecret, { accountSid })
    : accountSid && accountSid.startsWith("AC") && authToken
      ? twilio(accountSid, authToken)
      : null;

export const twilioFrom = process.env.TWILIO_PHONE_NUMBER ?? "";
export const twilioWhatsAppFrom = process.env.TWILIO_WHATSAPP_NUMBER ?? "whatsapp:+14155238886"; // Twilio sandbox default

export interface SendResult { success: boolean; error?: string; sid?: string; skipped?: boolean }

/** Normalise a UK number to E.164 for Twilio (+44…). */
function normaliseUKPhone(phone: string): string {
  const stripped = phone.replace(/[\s\-().]/g, "");
  if (stripped.startsWith("+44")) return stripped;
  if (stripped.startsWith("0")) return "+44" + stripped.slice(1);
  return stripped;
}

export async function sendSMS(to: string, body: string): Promise<SendResult> {
  if (!twilioClient || !twilioFrom) return { success: false, error: "Twilio not configured", skipped: true };
  try {
    const msg = await twilioClient.messages.create({ to: normaliseUKPhone(to), from: twilioFrom, body });
    return { success: true, sid: msg.sid };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function sendWhatsApp(to: string, body: string): Promise<SendResult> {
  if (!twilioClient) return { success: false, error: "Twilio not configured", skipped: true };
  try {
    const msg = await twilioClient.messages.create({
      to: `whatsapp:${normaliseUKPhone(to)}`,
      from: twilioWhatsAppFrom,
      body,
    });
    return { success: true, sid: msg.sid };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}
