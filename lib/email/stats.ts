/* eslint-disable @typescript-eslint/no-explicit-any -- untyped Supabase client */
import { createAdminClient } from "@/lib/supabase/server";

const DAY = 86_400_000;
const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 1000) / 10 : 0);

export interface TemplateStat { key: string; sent: number; delivered: number; opened: number; clicked: number; bounced: number }

/** Email performance over the last `days` days, per template and in total. Only emails sent via Resend count. */
export async function emailStats(days: number) {
  const db: any = createAdminClient();
  const since = new Date(Date.now() - days * DAY).toISOString();
  const { data } = await db.from("email_outbox").select("template_key, category, status, delivered_at, opened_at, clicked_at, bounced_at").gte("created_at", since).limit(20000);
  const perTemplate = new Map<string, TemplateStat>();
  const queue = { scheduled: 0, failed: 0, skipped: 0 };
  const total = { sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0 };
  for (const r of data ?? []) {
    if (r.status === "scheduled" || r.status === "sending") queue.scheduled++;
    if (r.status === "failed") queue.failed++;
    if (r.status === "skipped" || r.status === "cancelled") queue.skipped++;
    if (r.status !== "sent") continue;
    const t = perTemplate.get(r.template_key) ?? { key: r.template_key, sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0 };
    t.sent++; total.sent++;
    if (r.delivered_at) { t.delivered++; total.delivered++; }
    if (r.opened_at) { t.opened++; total.opened++; }
    if (r.clicked_at) { t.clicked++; total.clicked++; }
    if (r.bounced_at) { t.bounced++; total.bounced++; }
    perTemplate.set(r.template_key, t);
  }
  return {
    total: { ...total, deliveredPct: pct(total.delivered, total.sent), openedPct: pct(total.opened, total.sent), clickedPct: pct(total.clicked, total.sent) },
    queue,
    templates: [...perTemplate.values()].sort((a, b) => b.sent - a.sent),
  };
}

const STAGES = [
  { key: "enquiry", label: "Enquiries" },
  { key: "quoted", label: "Quote sent" },
  { key: "confirmed", label: "Deposit paid / confirmed" },
  { key: "completed", label: "Clean done" },
  { key: "paid", label: "Paid in full" },
] as const;

/**
 * The lead funnel for everything enquired in the last `days` days (a cohort: each booking counted once at
 * the furthest stage it ever reached, from status_history). `conversion` is enquiries → deposit paid.
 */
export async function funnel(days: number) {
  const db: any = createAdminClient();
  const since = new Date(Date.now() - days * DAY).toISOString();
  const { data: bs } = await db.from("bookings").select("id, status, source, utm_source, quote_sent_at, created_at, parent_booking_id").is("parent_booking_id", null).gte("created_at", since).limit(5000);
  const cohort = (bs ?? []).filter((b: any) => !["bad_lead"].includes(b.status));
  const ids = cohort.map((b: any) => b.id);
  const reached = new Map<string, Set<string>>();
  const confirmedAt = new Map<string, string>();
  if (ids.length) {
    for (let i = 0; i < ids.length; i += 400) {
      const { data: hist } = await db.from("status_history").select("booking_id, new_status, created_at").in("booking_id", ids.slice(i, i + 400));
      for (const h of hist ?? []) {
        if (!reached.has(h.booking_id)) reached.set(h.booking_id, new Set());
        reached.get(h.booking_id)!.add(h.new_status);
        if (h.new_status === "booking_confirmed" && !confirmedAt.has(h.booking_id)) confirmedAt.set(h.booking_id, h.created_at);
      }
    }
  }
  const has = (b: any, ...s: string[]) => s.some((x) => b.status === x || reached.get(b.id)?.has(x));
  const AFTER_CONFIRMED = ["booking_confirmed", "cleaner_assigned", "in_progress", "job_completed", "invoice_sent", "paid"];
  const counts = {
    enquiry: cohort.length,
    quoted: cohort.filter((b: any) => b.quote_sent_at || has(b, "quote_sent", ...AFTER_CONFIRMED)).length,
    confirmed: cohort.filter((b: any) => has(b, ...AFTER_CONFIRMED)).length,
    completed: cohort.filter((b: any) => has(b, "job_completed", "invoice_sent", "paid")).length,
    paid: cohort.filter((b: any) => has(b, "paid")).length,
  };
  const stages = STAGES.map((s, i) => ({ key: s.key, label: s.label, count: counts[s.key], ofEnquiries: pct(counts[s.key], counts.enquiry), ofPrevious: i === 0 ? 100 : pct(counts[s.key], counts[STAGES[i - 1].key]) }));

  // How many confirmed bookings had an automated email sent to them BEFORE they confirmed?
  let helped = 0;
  const confirmedIds = cohort.filter((b: any) => confirmedAt.has(b.id)).map((b: any) => b.id);
  if (confirmedIds.length) {
    const { data: sent } = await db.from("email_outbox").select("booking_id, sent_at, template_key").in("booking_id", confirmedIds).eq("status", "sent");
    const touched = new Set<string>();
    for (const e of sent ?? []) {
      const at = confirmedAt.get(e.booking_id);
      if (at && e.sent_at && e.sent_at < at && /follow-up|quote_|abandoned|lead_/.test(e.template_key)) touched.add(e.booking_id);
    }
    helped = touched.size;
  }

  const bySource = new Map<string, { enquiries: number; confirmed: number }>();
  for (const b of cohort) {
    const k = b.utm_source || b.source || "direct";
    const s = bySource.get(k) ?? { enquiries: 0, confirmed: 0 };
    s.enquiries++;
    if (has(b, ...AFTER_CONFIRMED)) s.confirmed++;
    bySource.set(k, s);
  }

  const { data: leads } = await db.from("abandoned_leads").select("converted_at").gte("created_at", since);
  const { data: lost } = await db.from("bookings").select("id").is("parent_booking_id", null).gte("created_at", since).in("status", ["cancelled", "not_a_good_fit", "bad_lead"]);
  return {
    days, stages, conversion: pct(counts.confirmed, counts.enquiry), helpedByEmail: helped,
    lost: lost?.length ?? 0,
    abandoned: { captured: leads?.length ?? 0, recovered: (leads ?? []).filter((l: any) => l.converted_at).length },
    bySource: [...bySource.entries()].map(([source, v]) => ({ source, ...v, rate: pct(v.confirmed, v.enquiries) })).sort((a, b) => b.enquiries - a.enquiries).slice(0, 8),
  };
}
