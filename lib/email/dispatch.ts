/* eslint-disable @typescript-eslint/no-explicit-any -- untyped Supabase client */
import { createAdminClient } from "@/lib/supabase/server";
import { resend, resendFrom, OUTBOUND_DISABLED } from "@/lib/resend";
import { logError } from "@/lib/log-error";
import { loadCompany, type Company } from "@/lib/email/config";
import { checkGuard } from "@/lib/email/guards";
import { scanJourneys } from "@/lib/email/journeys";
import { loadAutomations, loadTemplates, ensureSeeded } from "@/lib/email/store";
import { renderTemplate, type Rendered, type Vars } from "@/lib/email/render";
import { suppressionFor } from "@/lib/email/suppression";
import { abArm } from "@/lib/email/ab";
import { isPaused, NURTURE_JOURNEYS } from "@/lib/email/inbound";
import { channelSwitches } from "@/lib/notify";
import { sendSMS, sendWhatsApp } from "@/lib/twilio";

/** Automated mail only goes out between these London hours; anything due overnight waits for the morning. */
export const SEND_HOURS = { from: 8, until: 20 };
/** At most one marketing email per customer per this many days (campaigns included). */
export const MARKETING_GAP_DAYS = 3;
const BATCH = 40;
const SPACING_MS = 600; // Resend allows ~2 requests a second
const MAX_ATTEMPTS = 3;

export function londonHour(now: Date): number {
  return Number(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hour12: false, timeZone: "Europe/London" }).format(now)) % 24;
}
export const withinSendHours = (now: Date) => londonHour(now) >= SEND_HOURS.from && londonHour(now) < SEND_HOURS.until;

/** "Ample Cleaners <bookings@amplecleaners.com>" whatever shape RESEND_FROM_EMAIL has. */
function fromAddress(company: Company): string {
  const raw = resendFrom || "bookings@amplecleaners.com";
  return raw.includes("<") ? raw : `${company.name} <${raw}>`;
}

/** Sends one rendered email. Marketing mail carries the one-click unsubscribe headers Gmail/Yahoo expect. */
export async function sendRendered(p: { to: string; rendered: Rendered; company: Company }): Promise<{ id: string | null; error: string | null }> {
  if (OUTBOUND_DISABLED) return { id: "disabled", error: null };
  const headers: Record<string, string> = {};
  if (p.rendered.oneClickHref) {
    headers["List-Unsubscribe"] = `<${p.rendered.oneClickHref}>`;
    headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
  }
  const { data, error } = await resend.emails.send({
    from: fromAddress(p.company), to: p.to, subject: p.rendered.subject, html: p.rendered.html, text: p.rendered.text,
    ...(p.company.replyTo ? { replyTo: p.company.replyTo } : {}), headers,
  });
  return { id: data?.id ?? null, error: error ? `${error.name ?? "error"}: ${error.message}` : null };
}

interface DueRow {
  id: string; template_key: string; category: "service" | "marketing"; to_email: string; booking_id: string | null; customer_id: string | null;
  automation_key: string | null; campaign_id: string | null; vars: Vars; guard: any; attempts: number;
}

/**
 * Text-message twins of booking-critical emails (missed call, close-the-file, prep). Never for marketing.
 * Honours the Settings switches; if Twilio isn't configured the send is simply skipped.
 */
async function sendTexts(db: any, row: DueRow, r: Rendered): Promise<void> {
  if (OUTBOUND_DISABLED || (!r.sms && !r.whatsapp)) return;
  const q = db.from("customers").select("phone");
  const { data: c } = row.customer_id ? await q.eq("id", row.customer_id).maybeSingle() : await q.ilike("email", row.to_email).limit(1).maybeSingle();
  if (!c?.phone) return;
  const on = await channelSwitches();
  const patch: Record<string, string> = {};
  if (r.sms && on.sms) {
    const res = await sendSMS(c.phone, r.sms);
    if (res.success) patch.sms_sent_at = new Date().toISOString();
    else if (!res.skipped) await logError({ message: `sms failed: ${row.template_key}`, metadata: { to: c.phone, error: res.error }, level: "warn" });
  }
  if (r.whatsapp && on.whatsapp) {
    const res = await sendWhatsApp(c.phone, r.whatsapp);
    if (res.success) patch.whatsapp_sent_at = new Date().toISOString();
    else if (!res.skipped) await logError({ message: `whatsapp failed: ${row.template_key}`, metadata: { to: c.phone, error: res.error }, level: "warn" });
  }
  if (Object.keys(patch).length) await db.from("email_outbox").update(patch).eq("id", row.id);
}

const skip = (db: any, id: string, note: string, status: "skipped" | "cancelled" = "skipped") =>
  db.from("email_outbox").update({ status, status_note: note.slice(0, 300) }).eq("id", id);

/**
 * How many more automated emails may go out right now. The provider's daily cap (Settings) is shared with
 * booking emails, so automation stops a reserve short of it and booking confirmations always have room.
 */
export async function emailBudget(db: any, now: Date): Promise<{ limit: number; reserve: number; sent24h: number; remaining: number }> {
  const { data: s } = await db.from("settings").select("email_daily_limit").eq("id", 1).maybeSingle();
  const limit = Number(s?.email_daily_limit) || 100;
  const reserve = Math.max(10, Math.ceil(limit * 0.2));
  const { count } = await db.from("email_outbox").select("id", { count: "exact", head: true }).eq("status", "sent").gte("sent_at", new Date(now.getTime() - 86_400_000).toISOString());
  const sent24h = count ?? 0;
  return { limit, reserve, sent24h, remaining: Math.max(0, limit - reserve - sent24h) };
}

/**
 * Sends everything that is due. Returns counts for the cron response and the admin overview.
 * `onlyEmailLike` restricts the run to matching recipients (used by the test suite so it never touches real customers' queued mail).
 */
export async function dispatchDue(now: Date = new Date(), opts: { onlyEmailLike?: string } = {}): Promise<{ sent: number; skipped: number; failed: number; waiting: string | null }> {
  const out = { sent: 0, skipped: 0, failed: 0, waiting: null as string | null };
  if (!withinSendHours(now)) { out.waiting = "outside sending hours"; return out; }
  const db: any = createAdminClient();
  // A run that died mid-send leaves rows 'sending'; put long-overdue ones back in the queue.
  await db.from("email_outbox").update({ status: "scheduled" }).eq("status", "sending").lt("send_at", new Date(now.getTime() - 30 * 60_000).toISOString());
  const budget = await emailBudget(db, now);
  if (budget.remaining <= 0) { out.waiting = "daily send limit reached (room is kept for booking emails)"; return out; }
  let dueQuery = db.from("email_outbox").select("id, template_key, category, to_email, booking_id, customer_id, automation_key, campaign_id, vars, guard, attempts")
    .eq("status", "scheduled").lte("send_at", now.toISOString()).in("category", ["service", "marketing"]).order("send_at", { ascending: true }).limit(Math.min(BATCH, budget.remaining));
  if (opts.onlyEmailLike) dueQuery = dueQuery.ilike("to_email", opts.onlyEmailLike);
  const { data: due } = await dueQuery;
  if (!due?.length) return out;

  const [company, tpls, autos] = await Promise.all([loadCompany(), loadTemplates(), loadAutomations()]);
  for (const row of due as DueRow[]) {
    // Claim it so an overlapping run can't send the same email twice.
    const { data: claimed } = await db.from("email_outbox").update({ status: "sending" }).eq("id", row.id).eq("status", "scheduled").select("id");
    if (!claimed?.length) continue;

    const tpl = tpls.get(row.template_key);
    if (!tpl) { await skip(db, row.id, "template no longer exists"); out.skipped++; continue; }
    if (!tpl.enabled) { await skip(db, row.id, "template switched off", "cancelled"); out.skipped++; continue; }
    if (row.automation_key && autos.get(row.automation_key)?.enabled === false) { await skip(db, row.id, "journey switched off", "cancelled"); out.skipped++; continue; }

    const sup = await suppressionFor(row.to_email);
    if (sup === "all" || (sup === "marketing" && row.category === "marketing")) { await skip(db, row.id, sup === "all" ? "address bounced or complained" : "unsubscribed"); out.skipped++; continue; }

    // A customer who has just written back is in conversation with us: no sales nudges for a few days.
    if ((row.campaign_id || (row.automation_key && NURTURE_JOURNEYS.includes(row.automation_key))) && (await isPaused(row.to_email, row.customer_id))) {
      await skip(db, row.id, "customer replied recently", "cancelled"); out.skipped++; continue;
    }

    const guard = await checkGuard(row.guard ?? {}, row.booking_id, row.to_email);
    if (!guard.ok) { await skip(db, row.id, guard.reason, "cancelled"); out.skipped++; continue; }

    if (row.category === "marketing") {
      const since = new Date(now.getTime() - MARKETING_GAP_DAYS * 86_400_000).toISOString();
      const { data: recent } = await db.from("email_outbox").select("id").eq("category", "marketing").eq("status", "sent").ilike("to_email", row.to_email).gte("sent_at", since).limit(1);
      if (recent?.length) { await skip(db, row.id, `already emailed within ${MARKETING_GAP_DAYS} days`); out.skipped++; continue; }
    }

    // Subject-line test: a stable 50/50 split per recipient, so the same person always sees the same arm.
    const variant = tpl.subject_b ? abArm(`${row.to_email}|${row.template_key}`) : null;
    const rendered = renderTemplate(tpl, row.vars ?? {}, company, row.to_email, variant ?? "A");
    if (tpl.cta_label && !rendered.ctaHref) { await skip(db, row.id, "the button link is empty (e.g. no Google review link set in Settings)"); out.skipped++; continue; }

    const res = await sendRendered({ to: row.to_email, rendered, company }).catch((e) => ({ id: null, error: String(e) }));
    if (!res.error) {
      await db.from("email_outbox").update({ status: "sent", sent_at: new Date().toISOString(), resend_id: res.id, subject: rendered.subject, variant, attempts: row.attempts + 1, status_note: null }).eq("id", row.id);
      out.sent++;
      if (row.category === "service") await sendTexts(db, row, rendered).catch(() => undefined);
    } else if (/quota|rate.?limit|too many/i.test(res.error)) {
      // Not this email's fault: try again in a few hours, don't burn an attempt, stop for now.
      await db.from("email_outbox").update({ status: "scheduled", send_at: new Date(now.getTime() + 3 * 3_600_000).toISOString(), status_note: res.error.slice(0, 300) }).eq("id", row.id);
      await logError({ message: "email quota/rate limit hit; dispatch paused", metadata: { error: res.error }, level: "warn" });
      out.waiting = "email provider limit reached";
      break;
    } else {
      const attempts = row.attempts + 1;
      const final = attempts >= MAX_ATTEMPTS;
      await db.from("email_outbox").update({
        status: final ? "failed" : "scheduled", attempts, status_note: res.error.slice(0, 300), subject: rendered.subject,
        send_at: new Date(now.getTime() + 15 * 60_000).toISOString(),
      }).eq("id", row.id);
      if (final) { out.failed++; await logError({ message: `email failed after ${attempts} attempts: ${row.template_key}`, metadata: { to: row.to_email, error: res.error }, level: "warn" }); }
    }
    await new Promise((r) => setTimeout(r, SPACING_MS));
  }
  return out;
}

/** One dispatcher tick: schedule what's due, then send what's due. */
export async function runEmailEngine(now: Date = new Date()) {
  const { data: sw } = await (createAdminClient() as any).from("settings").select("email_paused").eq("id", 1).maybeSingle();
  if (sw?.email_paused) return { paused: true as const, scanned: {}, dispatched: { sent: 0, skipped: 0, failed: 0, waiting: "all automatic email is paused" } };
  await ensureSeeded();
  const scanned = await scanJourneys(now);
  const dispatched = await dispatchDue(now);
  return { scanned, dispatched };
}
