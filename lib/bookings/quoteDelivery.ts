/**
 * Quote + deposit delivery across email + SMS + WhatsApp. Ships with the
 * lesson already learned on Ample Removals (tasks/lessons.md, Lesson 3):
 * NO "confirm your quote" step — the customer goes straight from seeing
 * their price to paying a deposit to secure their date. One link, one CTA.
 */
import { notifyCustomer } from "@/lib/notify";
import { manageUrl } from "@/lib/bookings/links";
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
  try {
    const now = new Date().toISOString();
    await supabase.from("bookings").update({
      quote_sent_at: now, quote_followup_last_morning_sent_on: null, quote_followup_last_evening_sent_on: null,
    }).eq("id", bookingId);
  } catch (e) {
    console.warn("markQuoteSent follow-up fields skipped:", e);
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
      <div style="background: #15803d; padding: 24px; border-radius: 12px 12px 0 0;">
        <h1 style="color: #fff; margin: 0; font-size: 22px;">Your fixed price: ${amount}</h1>
      </div>
      <div style="background: #fff; padding: 32px; border: 1px solid #e2e8f0; border-top: 0; border-radius: 0 0 12px 12px;">
        <p style="font-size: 16px;">Hi ${firstName},</p>
        <p style="font-size: 16px; margin: 16px 0;">Thanks for choosing Ample Cleaners. Here's your fixed price for your ${serviceLabel.toLowerCase()} — what you see is exactly what you pay.</p>
        <div style="border: 2px solid #15803d; border-radius: 12px; padding: 18px; margin: 20px 0;">
          <table style="width:100%;"><tr>
            <td style="font-size: 16px; font-weight: bold; color: #14532d;">${serviceLabel}</td>
            <td style="text-align:right; font-size: 24px; font-weight: bold; color: #14532d;">${amount}</td>
          </tr></table>
        </div>
        <p style="font-size: 16px; margin: 0 0 8px;"><strong>Here's what you get:</strong></p>
        <ul style="margin: 0 0 20px; padding-left: 20px; font-size: 15px; line-height: 1.8;">
          <li>A DBS-checked, fully insured team — you'll know your cleaner's first name before the day</li>
          <li>A price that never changes on the day — no extras, no travel fee</li>
          <li>Free changes or cancellation up to 48 hours before</li>
          <li>The balance is only due <em>after</em> the clean</li>
        </ul>
        <p style="font-size: 16px; margin: 20px 0 12px;">Your date is held the moment you pay a ${depositPercentage}% deposit — just <strong>${deposit}</strong>, and it comes straight off your total.</p>
        <p style="text-align: center; margin: 0 0 24px;">
          <a href="${link}" style="background: #15803d; color: #fff; text-decoration: none; padding: 15px 30px; border-radius: 10px; font-weight: bold; font-size: 17px; display: inline-block; width: 80%;">
            Secure my date for ${deposit}
          </a>
        </p>
        <p style="font-size: 14px; color: #475569;">Not ready yet? No problem — your quote waits for you here: <a href="${link}" style="color: #15803d;">${link}</a></p>
        <p style="font-size: 15px; margin-top: 24px;">Questions? Just reply to this email or call us on ${PHONE}.<br><br>Ample Cleaners</p>
        <p style="font-size: 13px; color: #64748b;">Ref: ${reference}</p>
      </div>
    </div>`;

  const smsText = `Hi ${firstName}, your fixed price for ${serviceLabel.toLowerCase()} is ${amount}. Secure your date for just ${deposit} (it comes off the total): ${link} Ref ${reference}`;
  const whatsappText = `Hi ${firstName}, your fixed price is ready 🎉\n\n*${serviceLabel}: ${amount}*\n\n✅ DBS-checked cleaner\n✅ Price never changes on the day\n✅ Free changes up to 48h before\n\nSecure your date for just *${deposit}* (it comes off your total):\n${link}\n\nRef: ${reference}`;

  await notifyCustomer({ context: "quote sent", email, phone, subject: `${firstName}, your fixed price: ${amount} — secure your date for ${deposit}`, html: emailHtml, sms: smsText, whatsapp: whatsappText });
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
      <div style="background: #15803d; padding: 24px; border-radius: 12px 12px 0 0;">
        <h1 style="color: #fff; margin: 0; font-size: 22px;">One step to lock in your date</h1>
      </div>
      <div style="background: #fff; padding: 32px; border: 1px solid #e2e8f0; border-top: 0; border-radius: 0 0 12px 12px;">
        <p style="font-size: 16px;">Hi ${firstName},</p>
        <p style="font-size: 16px; margin: 16px 0;">Your date is held the moment your ${amount} deposit is in — and it comes off your total. Pick whichever's easiest:</p>
        <div style="background: #f0fdf4; border-left: 4px solid #15803d; padding: 16px; margin: 16px 0; border-radius: 4px;">
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

  await notifyCustomer({ context: "deposit instructions", email, phone, subject: `Lock in your date — ${amount} deposit (${reference})`, html: emailHtml, sms: smsText, whatsapp: whatsappText });
}

export interface DepositConfirmedParams {
  reference: string;
  firstName: string;
  email: string;
  phone: string;
  /** When given, the messages include a "manage your booking" link (change date / cancel). */
  bookingId?: string;
}

/** Sent once the deposit lands (card via webhook, or bank transfer verified by the admin). */
export async function sendDepositConfirmedMessages({ reference, firstName, email, phone, bookingId }: DepositConfirmedParams): Promise<void> {
  const manage = bookingId ? manageUrl(bookingId) : null;
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto;">
      <div style="background: #16a34a; padding: 24px; border-radius: 12px 12px 0 0;">
        <h1 style="color: #fff; margin: 0; font-size: 22px;">You're booked ✅</h1>
      </div>
      <div style="background: #fff; padding: 32px; border: 1px solid #e2e8f0; border-top: 0; border-radius: 0 0 12px 12px;">
        <p style="font-size: 16px;">Hi ${firstName},</p>
        <p style="font-size: 16px; margin: 16px 0;">Your deposit is in and your date is locked. Nothing more to do — here's what happens next:</p>
        <ol style="margin: 0 0 16px; padding-left: 20px; font-size: 15px; line-height: 1.8;">
          <li>We match you with a DBS-checked cleaner and tell you their first name.</li>
          <li>The day before, we send you a reminder.</li>
          <li>After the clean we invoice the balance — your deposit is already taken off.</li>
        </ol>
        ${manage ? `<p style="text-align:center;margin:20px 0;"><a href="${manage}" style="color:#15803d;font-weight:bold;">Need to change the date or cancel? Manage your booking</a></p>` : ""}
        <p style="font-size: 15px; margin-top: 16px;">Thank you,<br>Ample Cleaners · ${PHONE}</p>
        <p style="font-size: 13px; color: #94a3b8;">Ref: ${reference}</p>
      </div>
    </div>`;
  const smsText = `Ample Cleaners: you're booked! Your date is locked in and we're matching you with a DBS-checked cleaner.${manage ? ` Change or cancel: ${manage}` : ` Questions? Call ${PHONE}.`} Ref ${reference}`;
  const whatsappText = `Hi ${firstName}, you're booked ✅ Your date is locked in. Next: we match you with a DBS-checked cleaner and tell you their name.${manage ? `\n\nNeed to change it? ${manage}` : ""}\n\nRef: ${reference}`;

  await notifyCustomer({ context: "deposit confirmed", email, phone, subject: `You're booked ✅ Here's what happens next (${reference})`, html: emailHtml, sms: smsText, whatsapp: whatsappText });
}
