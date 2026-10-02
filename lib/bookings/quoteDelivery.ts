/**
 * Quote + deposit delivery across email + SMS + WhatsApp. Ships with the
 * lesson already learned on Ample Removals (tasks/lessons.md, Lesson 3):
 * NO "confirm your quote" step — the customer goes straight from seeing
 * their price to paying a deposit to secure their date. One link, one CTA.
 */
import { resend, resendFrom } from "@/lib/resend";
import { sendSMS, sendWhatsApp } from "@/lib/twilio";
import { formatCurrency } from "@/lib/utils";
import { BANK_DETAILS, BANK_DETAILS_CONFIGURED, depositFor } from "@/lib/deposit";
import { SERVICE_LABELS, type ServiceType } from "@/types";

const PHONE = "0333 000 0000";

/**
 * Moves a booking into `quote_sent`, records the transition. Best-effort on
 * anything beyond the core status column.
 */
export async function markQuoteSent(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  bookingId: string,
  previousStatus: string | null
): Promise<void> {
  const { error } = await supabase.from("bookings").update({ status: "quote_sent" }).eq("id", bookingId);
  if (error) {
    console.warn("markQuoteSent status update failed:", error.message);
    return;
  }
  await Promise.allSettled([
    supabase.from("status_history").insert({ booking_id: bookingId, previous_status: previousStatus, new_status: "quote_sent", changed_by: "system" }),
    supabase.from("activity_log").insert({ booking_id: bookingId, action: "Quote sent to customer", metadata: { channel: "instant_quote" }, performed_by: "system" }),
  ]);
}

export interface QuoteSentMessageParams {
  bookingId: string;
  token: string;
  reference: string;
  serviceType: ServiceType;
  firstName: string;
  email: string;
  phone: string;
  total: number;
  depositPercentage: number;
}

/**
 * Sends the quote: price + "pay your deposit to secure your date" CTA,
 * across email + SMS + WhatsApp. Links straight to the pay-deposit page
 * (no intermediate confirm screen — see module doc comment).
 */
export async function sendQuoteMessages({
  bookingId, token, reference, serviceType, firstName, email, phone, total, depositPercentage,
}: QuoteSentMessageParams): Promise<void> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const link = `${siteUrl}/quote/${bookingId}/${token}`;
  const amount = formatCurrency(total);
  const deposit = formatCurrency(depositFor(total, depositPercentage));
  const serviceLabel = SERVICE_LABELS[serviceType];

  const emailHtml = `
    <div style="font-family: Arial, sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto;">
      <div style="background: #0f766e; padding: 24px; border-radius: 12px 12px 0 0;">
        <h1 style="color: #fff; margin: 0; font-size: 22px;">Your quote is ready 🎉</h1>
      </div>
      <div style="background: #fff; padding: 32px; border: 1px solid #e2e8f0; border-top: 0; border-radius: 0 0 12px 12px;">
        <p style="font-size: 16px;">Hi ${firstName},</p>
        <p style="font-size: 16px; margin: 16px 0;">Here's your fixed-price quote for your ${serviceLabel.toLowerCase()}.</p>
        <div style="border: 2px solid #0f766e; border-radius: 12px; padding: 18px; margin: 20px 0;">
          <table style="width:100%;"><tr>
            <td style="font-size: 16px; font-weight: bold; color: #0f766e;">${serviceLabel}</td>
            <td style="text-align:right; font-size: 22px; font-weight: bold; color: #0f766e;">${amount}</td>
          </tr></table>
        </div>
        <p style="font-size: 16px; margin: 20px 0 12px;"><strong>Ready to secure your date? A small deposit does it — the rest isn't due until the job's done.</strong></p>
        <p style="text-align: center; margin: 0 0 24px;">
          <a href="${link}" style="background: #16a34a; color: #fff; text-decoration: none; padding: 14px 30px; border-radius: 10px; font-weight: bold; font-size: 16px; display: inline-block; width: 80%;">
            Pay ${deposit} deposit to secure your date
          </a>
        </p>
        <p style="font-size: 14px; color: #64748b;">Or open your quote any time: <a href="${link}" style="color: #0f766e;">${link}</a></p>
        <p style="font-size: 15px; margin-top: 24px;">Any questions? Just call us on ${PHONE}.<br><br>Ample Cleaners</p>
        <p style="font-size: 13px; color: #94a3b8;">Ref: ${reference}</p>
      </div>
    </div>`;

  const smsText = `Hi ${firstName}, your Ample Cleaners quote for ${serviceLabel.toLowerCase()} is ${amount}. Pay a small deposit to secure your date (rest due on completion): ${link} — Ref ${reference}`;
  const whatsappText = `Hi ${firstName}, your Ample Cleaners quote is ready 🎉\n\n*${serviceLabel}:* ${amount}\n\nA small deposit secures your date — the rest isn't due until the job's done:\n${link}\n\nRef: ${reference}`;

  await Promise.allSettled([
    resend.emails.send({ from: resendFrom, to: email, subject: `Your Ample Cleaners quote — ${amount} (${reference})`, html: emailHtml })
      .catch((e) => console.warn("quote email failed:", e)),
    sendSMS(phone, smsText),
    sendWhatsApp(phone, whatsappText),
  ]);
}

export interface DepositMessageParams {
  bookingId: string;
  token: string;
  reference: string;
  firstName: string;
  email: string;
  phone: string;
  deposit: number;
}

/**
 * Sent once the customer has reserved: the deposit amount, bank-transfer
 * details and reference, across email + SMS + WhatsApp.
 */
export async function sendDepositMessages({
  bookingId, token, reference, firstName, email, phone, deposit,
}: DepositMessageParams): Promise<void> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const link = `${siteUrl}/quote/${bookingId}/${token}`;
  const amount = formatCurrency(deposit);

  const bankRows = BANK_DETAILS_CONFIGURED
    ? `<table style="width:100%; font-size:15px; margin:8px 0;">
         <tr><td style="padding:6px 0; color:#64748b;">Account name</td><td style="padding:6px 0; font-weight:bold; text-align:right;">${BANK_DETAILS.accountName}</td></tr>
         <tr><td style="padding:6px 0; color:#64748b;">Sort code</td><td style="padding:6px 0; font-weight:bold; text-align:right;">${BANK_DETAILS.sortCode}</td></tr>
         <tr><td style="padding:6px 0; color:#64748b;">Account number</td><td style="padding:6px 0; font-weight:bold; text-align:right;">${BANK_DETAILS.accountNumber}</td></tr>
         <tr><td style="padding:6px 0; color:#64748b;">Reference</td><td style="padding:6px 0; font-weight:bold; text-align:right;">${reference}</td></tr>
       </table>`
    : `<p style="font-size:15px;">Please call us on ${PHONE} to pay your deposit.</p>`;

  const emailHtml = `
    <div style="font-family: Arial, sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto;">
      <div style="background: #0f766e; padding: 24px; border-radius: 12px 12px 0 0;">
        <h1 style="color: #fff; margin: 0; font-size: 22px;">Secure your date 🎉</h1>
      </div>
      <div style="background: #fff; padding: 32px; border: 1px solid #e2e8f0; border-top: 0; border-radius: 0 0 12px 12px;">
        <p style="font-size: 16px;">Hi ${firstName},</p>
        <p style="font-size: 16px; margin: 16px 0;">Choose how you'd like to pay your ${amount} deposit — all options are on your booking page:</p>
        <div style="background: #f0fdfa; border-left: 4px solid #0f766e; padding: 16px; margin: 16px 0; border-radius: 4px;">
          <p style="margin: 0 0 6px; font-size: 15px;">💳 <strong>Pay ${amount} by card</strong> — instant, secures your date.</p>
          <p style="margin: 0; font-size: 15px;">🏦 <strong>Pay ${amount} by bank transfer</strong> — no card fee:</p>
          ${bankRows}
        </div>
        <p style="font-size: 14px; color: #475569;">For bank transfer, use <strong>${reference}</strong> as the payment reference, then tap "I've made the bank transfer" on your booking page.</p>
        <p style="text-align: center; margin: 24px 0;">
          <a href="${link}" style="background: #16a34a; color: #fff; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: bold; font-size: 16px; display: inline-block;">
            Pay &amp; secure my date
          </a>
        </p>
        <p style="font-size: 14px; color: #64748b;">Any questions? Call us on ${PHONE}.</p>
        <p style="font-size: 15px; margin-top: 16px;">Ample Cleaners</p>
        <p style="font-size: 13px; color: #94a3b8;">Ref: ${reference}</p>
      </div>
    </div>`;

  const smsText = `Ample Cleaners: pay your ${amount} deposit by card or bank transfer to secure your date: ${link} (Ref ${reference})`;
  const whatsappText = `Hi ${firstName}, pay your ${amount} deposit to secure your date 🎉\n\n💳 Card or 🏦 bank transfer, your choice:\n${link}\n\nRef: ${reference}`;

  await Promise.allSettled([
    resend.emails.send({ from: resendFrom, to: email, subject: `Pay your deposit to secure your date (${reference})`, html: emailHtml })
      .catch((e) => console.warn("deposit email failed:", e)),
    sendSMS(phone, smsText),
    sendWhatsApp(phone, whatsappText),
  ]);
}

export interface DepositConfirmedParams {
  reference: string;
  firstName: string;
  email: string;
  phone: string;
}

/** Sent once the admin verifies the deposit landed. */
export async function sendDepositConfirmedMessages({ reference, firstName, email, phone }: DepositConfirmedParams): Promise<void> {
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto;">
      <div style="background: #16a34a; padding: 24px; border-radius: 12px 12px 0 0;">
        <h1 style="color: #fff; margin: 0; font-size: 22px;">Your deposit is confirmed ✅</h1>
      </div>
      <div style="background: #fff; padding: 32px; border: 1px solid #e2e8f0; border-top: 0; border-radius: 0 0 12px 12px;">
        <p style="font-size: 16px;">Hi ${firstName},</p>
        <p style="font-size: 16px; margin: 16px 0;">Great news — your deposit is confirmed and your date is locked in. 🎉</p>
        <p style="font-size: 16px; margin: 16px 0;">We'll be in touch with the cleaner details closer to the day.</p>
        <p style="font-size: 15px; margin-top: 16px;">Thank you,<br>Ample Cleaners · ${PHONE}</p>
        <p style="font-size: 13px; color: #94a3b8;">Ref: ${reference}</p>
      </div>
    </div>`;
  const smsText = `Ample Cleaners: your deposit is confirmed and your date is locked in! Questions? Call ${PHONE}. Ref ${reference}`;
  const whatsappText = `Hi ${firstName}, great news — your deposit is confirmed ✅ Your date is locked in. We'll be in touch with the cleaner details soon.\n\nRef: ${reference}`;

  await Promise.allSettled([
    resend.emails.send({ from: resendFrom, to: email, subject: `Your deposit is confirmed (${reference})`, html: emailHtml })
      .catch((e) => console.warn("deposit-confirmed email failed:", e)),
    sendSMS(phone, smsText),
    sendWhatsApp(phone, whatsappText),
  ]);
}
