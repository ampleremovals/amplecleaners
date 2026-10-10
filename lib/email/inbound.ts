/* eslint-disable @typescript-eslint/no-explicit-any -- untyped Supabase client */
/**
 * Customer replies. Resend delivers each received email to /api/webhooks/resend as `email.received`
 * (metadata only); we fetch the body, file it in the Inbox, and PAUSE the sales follow-ups for that customer
 * so nobody who just wrote back is chased by a robot. Auto-replies and bounces never pause anything.
 */
import { createAdminClient } from "@/lib/supabase/server";
import { sendEmailSafe } from "@/lib/notify";
import { resendAdminEmail } from "@/lib/resend";
import { loadCompany, SITE_URL } from "@/lib/email/config";
import { escapeHtml } from "@/lib/email/markup";
import { isErasedAddress } from "@/lib/email/suppression";
import { htmlToText, isAutoReply, parseAddress, stripQuotedReply } from "@/lib/email/inbound-parse";

export { isAutoReply, parseAddress, stripQuotedReply };

/** Journeys that chase a sale. These stop while a customer is in conversation with us. */
export const NURTURE_JOURNEYS = ["lead_not_answered", "abandoned_form", "quote_close_file", "quote_winback", "quote_viewed", "upsell_recurring", "rebook", "winback"];
export const PAUSE_DAYS = 7;

interface Received { subject: string | null; text: string | null; headers: Record<string, unknown> | null; messageId: string | null }

/** Fetches the body of a received email. Returns null if the key can't read received mail. */
export async function fetchReceived(emailId: string): Promise<Received | null> {
  const key = process.env.RESEND_RECEIVE_KEY || process.env.RESEND_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}`, { headers: { Authorization: `Bearer ${key}` }, cache: "no-store" });
    if (!res.ok) return null;
    const j: any = await res.json();
    const text: string | null = j.text || (j.html ? htmlToText(String(j.html)) : null);
    return { subject: j.subject ?? null, text, headers: j.headers ?? null, messageId: j.message_id ?? null };
  } catch {
    return null;
  }
}

/** Stops sales follow-ups for this customer for `days` days and cancels what is already queued. */
export async function pauseFollowups(email: string, customerId: string | null, days = PAUSE_DAYS, note = "customer replied"): Promise<number> {
  const db: any = createAdminClient();
  const until = new Date(Date.now() + days * 86_400_000).toISOString();
  if (customerId) await db.from("customers").update({ followups_paused_until: until }).eq("id", customerId);
  else await db.from("customers").update({ followups_paused_until: until }).ilike("email", email);
  const { data } = await db.from("email_outbox").update({ status: "cancelled", status_note: note })
    .eq("status", "scheduled").ilike("to_email", email).or(`automation_key.in.(${NURTURE_JOURNEYS.join(",")}),campaign_id.not.is.null`).select("id");
  return data?.length ?? 0;
}

export async function resumeFollowups(email: string, customerId: string | null): Promise<void> {
  const db: any = createAdminClient();
  if (customerId) await db.from("customers").update({ followups_paused_until: null }).eq("id", customerId);
  else await db.from("customers").update({ followups_paused_until: null }).ilike("email", email);
}

/** Is a customer currently in conversation with us (so sales nudges should wait)? */
export async function isPaused(email: string, customerId: string | null): Promise<boolean> {
  const db: any = createAdminClient();
  const q = db.from("customers").select("followups_paused_until");
  const { data } = customerId ? await q.eq("id", customerId).maybeSingle() : await q.ilike("email", email).limit(1).maybeSingle();
  return !!data?.followups_paused_until && new Date(data.followups_paused_until).getTime() > Date.now();
}

/** Called by the Resend webhook for every `email.received` event. Idempotent. */
export async function handleInboundEmail(data: any): Promise<{ stored: boolean; paused: boolean }> {
  const emailId: string | undefined = data?.email_id;
  if (!emailId) return { stored: false, paused: false };
  const db: any = createAdminClient();
  const { data: seen } = await db.from("inbox_messages").select("id").eq("resend_email_id", emailId).maybeSingle();
  if (seen) return { stored: false, paused: false };

  const from = parseAddress(String(data.from ?? ""));
  if (!from.email || isErasedAddress(from.email)) return { stored: false, paused: false };
  const body = await fetchReceived(emailId);
  const subject: string | null = body?.subject ?? data.subject ?? null;
  const auto = isAutoReply({ from: from.email, subject, headers: body?.headers });

  const { data: cust } = await db.from("customers").select("id, full_name").ilike("email", from.email).limit(1).maybeSingle();
  const text = body?.text ? stripQuotedReply(body.text).slice(0, 8000) : null;
  const { error } = await db.from("inbox_messages").insert({
    direction: "in", customer_id: cust?.id ?? null, email: from.email, from_name: from.name ?? cust?.full_name ?? null, subject,
    body_text: text, body_available: !!body, resend_email_id: emailId, message_id: body?.messageId ?? data.message_id ?? null, auto_reply: auto,
  });
  if (error) return { stored: false, paused: false }; // unique violation = a duplicate delivery of the same event

  let paused = false;
  if (!auto) {
    if (cust) { await pauseFollowups(from.email, cust.id); paused = true; }
    const company = await loadCompany();
    await sendEmailSafe({
      to: resendAdminEmail, context: "admin: customer replied",
      subject: `💬 ${from.name ?? cust?.full_name ?? from.email} replied${subject ? `: ${subject}` : ""}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;"><p><strong>${escapeHtml(from.name ?? cust?.full_name ?? from.email)}</strong> (${escapeHtml(from.email)}) wrote:</p><blockquote style="margin:0 0 16px;padding:10px 14px;background:#f1f5f9;border-left:4px solid #15803d;white-space:pre-wrap;">${escapeHtml((text ?? "(the message body couldn't be loaded. Open it in the Inbox)").slice(0, 1200))}</blockquote><p><a href="${SITE_URL}/admin/inbox?email=${encodeURIComponent(from.email)}" style="background:#15803d;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:bold;">Open in Inbox</a></p><p style="font-size:12px;color:#64748b;">${paused ? "Automatic sales follow-ups to this customer are paused for 7 days. " : ""}${escapeHtml(company.name)}</p></div>`,
    });
  }
  return { stored: true, paused };
}
