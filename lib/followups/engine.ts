import { createAdminClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/resend";
import { sendSMS, sendWhatsApp } from "@/lib/twilio";
import { formatCurrency } from "@/lib/utils";
import { COMPANY_ADDRESS, COMPANY_PHONE } from "@/lib/constants";
import { generateQuoteConfirmToken } from "@/lib/tokens";
import { suppressionFor } from "@/lib/email/suppression";
import { isPaused } from "@/lib/email/inbound";
import { unsubscribeUrl } from "@/lib/email/unsubscribe";
import { QUOTE_FOLLOWUP_DAYS, DEPOSIT_FOLLOWUP_DAYS, type FollowupVars } from "@/lib/followups/content";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.amplecleaners.com";
const MAX_DAY = 7;
const SMS_CUTOFF_DAY = 5;

/** Calendar-day offset from an anchor timestamp — 0 the day it was sent, 1 the
 *  next calendar day. Date-based (not 24h-based) so a quote sent at 11pm and
 *  one sent at 7am both start their drip the next morning. */
function dayNumberSince(anchorISO: string | null): number | null {
  if (!anchorISO) return null;
  const anchor = new Date(anchorISO);
  const anchorDate = Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), anchor.getUTCDate());
  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((today - anchorDate) / 86_400_000);
}

function todayISODate(): string {
  return new Date().toISOString().slice(0, 10);
}

function wrapEmail(subject: string, bodyHtml: string, toEmail: string): string {
  const stop = unsubscribeUrl(toEmail);
  return `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:0;">
    <div style="background:#15803d;padding:22px 28px;border-radius:12px 12px 0 0;">
      <p style="color:#fff;margin:0;font-size:19px;font-weight:bold;">${subject}</p>
    </div>
    <div style="background:#fff;border:1px solid #e2e8f0;border-top:0;border-radius:0 0 12px 12px;padding:28px;">
      ${bodyHtml}
      <p style="margin:20px 0 0;font-size:13px;color:#94a3b8;">Ample Cleaners · ${COMPANY_ADDRESS} · ${COMPANY_PHONE}${stop ? ` · <a href="${stop}" style="color:#94a3b8;">Stop these reminders</a>` : ""}</p>
    </div>
  </body></html>`;
}

/**
 * The follow-up ladder obeys the same rules as every other sales email: nothing to someone who unsubscribed or
 * bounced, and nothing while they are in conversation with us (they replied, or an admin paused them).
 * Not stamped as sent, so it simply carries on when the pause ends.
 */
async function mayChase(email: string | null | undefined): Promise<boolean> {
  if (!email) return true; // phone-only contacts: SMS/WhatsApp switches are handled in Settings
  if ((await suppressionFor(email)) !== "none") return false;
  return !(await isPaused(email, null));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAdmin = ReturnType<typeof createAdminClient>;

/** Flags a booking for human review after MAX_DAY days of silence. */
async function flagForReview(supabase: SupabaseAdmin, bookingId: string, reference: string, reason: string): Promise<void> {
  await supabase.from("bookings").update({ is_flagged: true, flag_reason: reason }).eq("id", bookingId);
  try {
    await supabase.from("activity_log").insert({ booking_id: bookingId, action: `Auto-flagged for review: ${reason}`, performed_by: "system" });
  } catch { /* best-effort */ }
}

interface QuoteCandidate {
  id: string; reference: string; quote_total: number | null; quote_sent_at: string | null;
  quote_followup_last_morning_sent_on: string | null; quote_followup_last_evening_sent_on: string | null;
  customer: { full_name: string; email: string; phone: string } | { full_name: string; email: string; phone: string }[] | null;
}

function oneCustomer<T>(c: T | T[] | null): T | null {
  return Array.isArray(c) ? (c[0] ?? null) : c;
}

async function quoteCandidates(supabase: SupabaseAdmin, slotColumn: "quote_followup_last_morning_sent_on" | "quote_followup_last_evening_sent_on") {
  const { data } = await supabase
    .from("bookings")
    .select("id, reference, quote_total, quote_sent_at, quote_followup_last_morning_sent_on, quote_followup_last_evening_sent_on, customer:customers!inner(full_name, email, phone)")
    .eq("status", "quote_sent")
    .eq("is_flagged", false)
    .or(`${slotColumn}.is.null,${slotColumn}.lt.${todayISODate()}`);
  return (data ?? []) as unknown as QuoteCandidate[];
}

function quoteVars(b: QuoteCandidate, customer: { full_name: string; email: string; phone: string }): FollowupVars {
  const token = generateQuoteConfirmToken(b.id);
  return {
    firstName: (customer.full_name || "there").split(" ")[0],
    total: formatCurrency(Number(b.quote_total ?? 0)),
    reference: b.reference,
    actionLink: token ? `${SITE_URL}/quote/${b.id}/${token}` : `${SITE_URL}/quote/${b.id}`,
    phone: COMPANY_PHONE,
  };
}

export async function runQuoteFollowupMorning(): Promise<{ sent: number; flagged: number }> {
  const supabase = createAdminClient();
  const candidates = await quoteCandidates(supabase, "quote_followup_last_morning_sent_on");
  let sent = 0, flagged = 0;

  for (const b of candidates) {
    const customer = oneCustomer(b.customer);
    if (!customer) continue;
    if (!(await mayChase(customer.email))) continue;
    const day = dayNumberSince(b.quote_sent_at);
    if (day === null || day < 1) continue;
    if (day > MAX_DAY) {
      await flagForReview(supabase, b.id, b.reference, "No response after the quote follow-up ladder ended");
      flagged++;
      continue;
    }
    const content = QUOTE_FOLLOWUP_DAYS[day];
    if (!content) continue;
    const v = quoteVars(b, customer);

    try {
      if (customer.email) await sendEmail({ to: customer.email, subject: content.emailSubject(v), html: wrapEmail(content.emailSubject(v), content.emailBody(v), customer.email), context: "quote follow-up day " + day });
      if (customer.phone && day <= SMS_CUTOFF_DAY && content.sms) await sendSMS(customer.phone, content.sms(v));
    } catch { /* best-effort, still stamp so we don't retry-storm on a broken address */ }

    await supabase.from("bookings").update({ quote_followup_last_morning_sent_on: todayISODate() }).eq("id", b.id);
    sent++;
  }
  return { sent, flagged };
}

export async function runQuoteFollowupEvening(): Promise<{ sent: number }> {
  const supabase = createAdminClient();
  const candidates = await quoteCandidates(supabase, "quote_followup_last_evening_sent_on");
  let sent = 0;

  for (const b of candidates) {
    const customer = oneCustomer(b.customer);
    if (!customer?.phone) continue;
    if (!(await mayChase(customer.email))) continue;
    const day = dayNumberSince(b.quote_sent_at);
    if (day === null || day < 1 || day > MAX_DAY) continue;
    const content = QUOTE_FOLLOWUP_DAYS[day];
    if (!content) continue;
    const v = quoteVars(b, customer);

    try {
      await sendWhatsApp(customer.phone, content.whatsapp(v));
    } catch { /* best-effort */ }

    await supabase.from("bookings").update({ quote_followup_last_evening_sent_on: todayISODate() }).eq("id", b.id);
    sent++;
  }
  return { sent };
}

interface DepositCandidate {
  id: string; reference: string; deposit_followup_started_at: string | null; deposit_amount: number | null;
  customer: { full_name: string; email: string; phone: string } | { full_name: string; email: string; phone: string }[] | null;
}

async function depositCandidates(supabase: SupabaseAdmin, slotColumn: "deposit_followup_last_morning_sent_on" | "deposit_followup_last_evening_sent_on") {
  const { data } = await supabase
    .from("bookings")
    .select("id, reference, deposit_followup_started_at, deposit_amount, customer:customers!inner(full_name, email, phone)")
    .eq("status", "deposit_invoice_sent")
    .eq("is_flagged", false)
    .or(`${slotColumn}.is.null,${slotColumn}.lt.${todayISODate()}`);
  return (data ?? []) as unknown as DepositCandidate[];
}

function depositVars(b: DepositCandidate, customer: { full_name: string; email: string; phone: string }): FollowupVars {
  const token = generateQuoteConfirmToken(b.id);
  return {
    firstName: (customer.full_name || "there").split(" ")[0],
    total: formatCurrency(Number(b.deposit_amount ?? 0)),
    reference: b.reference,
    actionLink: token ? `${SITE_URL}/quote/${b.id}/${token}` : `${SITE_URL}/quote/${b.id}`,
    phone: COMPANY_PHONE,
  };
}

export async function runDepositFollowupMorning(): Promise<{ sent: number; flagged: number }> {
  const supabase = createAdminClient();
  const candidates = await depositCandidates(supabase, "deposit_followup_last_morning_sent_on");
  let sent = 0, flagged = 0;

  for (const b of candidates) {
    const customer = oneCustomer(b.customer);
    if (!customer) continue;
    if (!(await mayChase(customer.email))) continue;
    const day = dayNumberSince(b.deposit_followup_started_at);
    if (day === null || day < 1) continue;
    if (day > MAX_DAY) {
      await flagForReview(supabase, b.id, b.reference, "No deposit payment after the follow-up ladder ended");
      flagged++;
      continue;
    }
    const content = DEPOSIT_FOLLOWUP_DAYS[day];
    if (!content) continue;
    const v = depositVars(b, customer);

    try {
      if (customer.email) await sendEmail({ to: customer.email, subject: content.emailSubject(v), html: wrapEmail(content.emailSubject(v), content.emailBody(v), customer.email), context: "deposit follow-up day " + day });
      if (customer.phone && day <= SMS_CUTOFF_DAY && content.sms) await sendSMS(customer.phone, content.sms(v));
    } catch { /* best-effort */ }

    await supabase.from("bookings").update({ deposit_followup_last_morning_sent_on: todayISODate() }).eq("id", b.id);
    sent++;
  }
  return { sent, flagged };
}

export async function runDepositFollowupEvening(): Promise<{ sent: number }> {
  const supabase = createAdminClient();
  const candidates = await depositCandidates(supabase, "deposit_followup_last_evening_sent_on");
  let sent = 0;

  for (const b of candidates) {
    const customer = oneCustomer(b.customer);
    if (!customer?.phone) continue;
    if (!(await mayChase(customer.email))) continue;
    const day = dayNumberSince(b.deposit_followup_started_at);
    if (day === null || day < 1 || day > MAX_DAY) continue;
    const content = DEPOSIT_FOLLOWUP_DAYS[day];
    if (!content) continue;
    const v = depositVars(b, customer);

    try {
      await sendWhatsApp(customer.phone, content.whatsapp(v));
    } catch { /* best-effort */ }

    await supabase.from("bookings").update({ deposit_followup_last_evening_sent_on: todayISODate() }).eq("id", b.id);
    sent++;
  }
  return { sent };
}
