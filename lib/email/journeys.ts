/* eslint-disable @typescript-eslint/no-explicit-any -- untyped Supabase client */
/**
 * The journey scanner. Instead of hooking every place a booking can change status (customer, admin,
 * cleaner app, Stripe webhook, cron…), it looks at the database every few minutes and schedules whatever
 * email is now due. Each candidate carries a `dedupeKey`, so scanning again never double-sends, and a
 * `guard` that is re-checked at the moment of sending (the customer may have paid or booked in between).
 *
 * Recent-window rule: every journey only looks at events from the last ~10-14 days, so switching the
 * system on never blasts people about things that happened months ago.
 */
import { createAdminClient } from "@/lib/supabase/server";
import { enqueue, type EnqueueInput } from "@/lib/email/outbox";
import { ensureSeeded, loadAutomations, loadTemplates, type AutomationRow, type TemplateRow } from "@/lib/email/store";
import { bookingLink, manageLink, quoteLink, rateLink, regularLink } from "@/lib/email/links";
import { PREP_TIPS } from "@/lib/email/defaults";
import { DEAD_STATUSES } from "@/lib/email/guards";
import { todayInLondon } from "@/lib/cleaner-auth";
import { formatCurrency, formatDate } from "@/lib/utils";
import { SERVICE_LABELS, type ServiceType } from "@/types";

const H = 3_600_000;
const DAY = 24 * H;
const COMPLETED = ["job_completed", "invoice_sent", "paid"];

interface Ctx { db: any; now: Date; today: string; autos: Map<string, AutomationRow>; tpls: Map<string, TemplateRow> }

const one = <T,>(x: T | T[] | null | undefined): T | null => (Array.isArray(x) ? (x[0] ?? null) : (x ?? null));
const first = (name: string | null | undefined) => String(name ?? "there").trim().split(/\s+/)[0] || "there";
const lower = (t: string) => SERVICE_LABELS[t as ServiceType]?.toLowerCase() ?? "clean";
const label = (t: string) => SERVICE_LABELS[t as ServiceType] ?? "Cleaning";
const category = (c: Ctx, key: string): "service" | "marketing" => c.tpls.get(key)?.category ?? "marketing";
const on = (c: Ctx, key: string) => c.autos.get(key)?.enabled !== false;
const steps = (c: Ctx, key: string) => c.autos.get(key)?.steps ?? [];
/** Only schedule things whose send time falls between `back` ago and tomorrow. */
const inWindow = (c: Ctx, sendAt: Date, back = 10 * DAY) => sendAt.getTime() >= c.now.getTime() - back && sendAt.getTime() <= c.now.getTime() + DAY;
const plusDays = (iso: string, n: number) => new Date(new Date(`${iso}T00:00:00Z`).getTime() + n * DAY).toISOString().slice(0, 10);

// ── 1. Lead didn't pick up ─────────────────────────────────────────────────
async function scanMissedCall(c: Ctx): Promise<EnqueueInput[]> {
  if (!on(c, "lead_not_answered")) return [];
  const { data: bs } = await c.db.from("bookings").select("id, reference, service_type, customer:customers(id, full_name, email)").eq("status", "not_answered").limit(200);
  if (!bs?.length) return [];
  const { data: hist } = await c.db.from("status_history").select("booking_id, created_at").in("booking_id", bs.map((b: any) => b.id)).eq("new_status", "not_answered").order("created_at", { ascending: false });
  const anchor = new Map<string, string>();
  for (const h of hist ?? []) if (!anchor.has(h.booking_id)) anchor.set(h.booking_id, h.created_at);
  const out: EnqueueInput[] = [];
  for (const b of bs) {
    const cust = one<any>(b.customer);
    const at = anchor.get(b.id);
    if (!cust?.email || !at) continue;
    for (const [i, s] of steps(c, "lead_not_answered").entries()) {
      const sendAt = new Date(new Date(at).getTime() + s.hours * H);
      if (!inWindow(c, sendAt, 14 * DAY)) continue;
      out.push({
        templateKey: s.template, category: category(c, s.template), to: cust.email, customerId: cust.id, bookingId: b.id, automationKey: "lead_not_answered",
        vars: { firstName: first(cust.full_name), reference: b.reference, serviceLower: lower(b.service_type) },
        guard: { statusIn: ["not_answered"] }, dedupeKey: `lead_not_answered:${i}:${b.id}:${new Date(at).getTime()}`, sendAt,
      });
    }
  }
  return out;
}

// ── 2. Unfinished booking form ─────────────────────────────────────────────
async function scanAbandoned(c: Ctx): Promise<EnqueueInput[]> {
  if (!on(c, "abandoned_form")) return [];
  const { data: leads } = await c.db.from("abandoned_leads").select("*").is("converted_at", null).gte("updated_at", new Date(c.now.getTime() - 3 * DAY).toISOString()).limit(300);
  const out: EnqueueInput[] = [];
  for (const l of leads ?? []) {
    for (const [i, s] of steps(c, "abandoned_form").entries()) {
      const sendAt = new Date(new Date(l.updated_at).getTime() + s.hours * H);
      if (!inWindow(c, sendAt, 3 * DAY)) continue;
      out.push({
        templateKey: s.template, category: category(c, s.template), to: l.email, automationKey: "abandoned_form",
        vars: { firstName: first(l.full_name), serviceLower: lower(l.service_type), bookingLink: bookingLink(l.service_type) },
        guard: { leadId: l.id }, dedupeKey: `abandoned:${i}:${l.id}:${new Date(l.created_at).getTime()}`, sendAt,
      });
    }
  }
  return out;
}

// ── 3. Quotes that went quiet ──────────────────────────────────────────────
async function scanQuotes(c: Ctx, key: "quote_close_file" | "quote_winback"): Promise<EnqueueInput[]> {
  if (!on(c, key)) return [];
  const { data: bs } = await c.db.from("bookings").select("id, reference, service_type, quote_total, quote_sent_at, customer:customers(id, full_name, email)")
    .eq("status", "quote_sent").not("quote_sent_at", "is", null).gte("quote_sent_at", new Date(c.now.getTime() - 100 * DAY).toISOString()).limit(300);
  const out: EnqueueInput[] = [];
  for (const b of bs ?? []) {
    const cust = one<any>(b.customer);
    if (!cust?.email) continue;
    for (const [i, s] of steps(c, key).entries()) {
      const sendAt = new Date(new Date(b.quote_sent_at).getTime() + s.hours * H);
      if (!inWindow(c, sendAt)) continue;
      out.push({
        templateKey: s.template, category: category(c, s.template), to: cust.email, customerId: cust.id, bookingId: b.id, automationKey: key,
        vars: { firstName: first(cust.full_name), reference: b.reference, serviceLower: lower(b.service_type), quoteTotal: formatCurrency(Number(b.quote_total ?? 0)), quoteLink: quoteLink(b.id), bookingLink: bookingLink(b.service_type) },
        guard: { statusIn: ["quote_sent"] }, dedupeKey: `${key}:${i}:${b.id}`, sendAt,
      });
    }
  }
  return out;
}

// ── 4. Preparation checklist before the first clean ────────────────────────
async function scanPrep(c: Ctx): Promise<EnqueueInput[]> {
  if (!on(c, "prep_checklist")) return [];
  const s = steps(c, "prep_checklist")[0];
  if (!s) return [];
  const days = Math.max(2, Math.ceil(s.hours / 24));
  const { data: bs } = await c.db.from("bookings").select("id, reference, service_type, clean_date, customer:customers(id, full_name, email)")
    .in("status", ["booking_confirmed", "cleaner_assigned"]).is("parent_booking_id", null).not("clean_date", "is", null)
    .gte("clean_date", plusDays(c.today, 2)).lte("clean_date", plusDays(c.today, days)).limit(300);
  const out: EnqueueInput[] = [];
  for (const b of bs ?? []) {
    const cust = one<any>(b.customer);
    if (!cust?.email) continue;
    out.push({
      templateKey: s.template, category: category(c, s.template), to: cust.email, customerId: cust.id, bookingId: b.id, automationKey: "prep_checklist",
      vars: { firstName: first(cust.full_name), reference: b.reference, serviceLower: lower(b.service_type), cleanDate: formatDate(b.clean_date), prepTips: PREP_TIPS[b.service_type] ?? PREP_TIPS.regular_cleaning, manageLink: manageLink(b.id) },
      guard: { statusIn: ["booking_confirmed", "cleaner_assigned"] }, dedupeKey: `prep:${b.id}:${b.clean_date}`,
    });
  }
  return out;
}

// ── 5. After the clean: rating ask ─────────────────────────────────────────
async function scanPostClean(c: Ctx): Promise<EnqueueInput[]> {
  if (!on(c, "post_clean")) return [];
  const { data: hist } = await c.db.from("status_history").select("booking_id, created_at").eq("new_status", "job_completed").gte("created_at", new Date(c.now.getTime() - 4 * DAY).toISOString()).order("created_at", { ascending: false }).limit(300);
  const doneAt = new Map<string, string>();
  for (const h of hist ?? []) if (!doneAt.has(h.booking_id)) doneAt.set(h.booking_id, h.created_at);
  if (!doneAt.size) return [];
  const { data: bs } = await c.db.from("bookings").select("id, reference, service_type, status, parent_booking_id, customer:customers(id, full_name, email)").in("id", [...doneAt.keys()]).in("status", COMPLETED).is("parent_booking_id", null);
  const out: EnqueueInput[] = [];
  for (const b of bs ?? []) {
    const cust = one<any>(b.customer);
    const link = rateLink(b.id);
    if (!cust?.email || !link) continue;
    for (const [i, s] of steps(c, "post_clean").entries()) {
      const sendAt = new Date(new Date(doneAt.get(b.id)!).getTime() + s.hours * H);
      if (!inWindow(c, sendAt, 4 * DAY)) continue;
      out.push({
        templateKey: s.template, category: category(c, s.template), to: cust.email, customerId: cust.id, bookingId: b.id, automationKey: "post_clean",
        vars: { firstName: first(cust.full_name), reference: b.reference, serviceLower: lower(b.service_type), rateLink: link },
        guard: { notRated: true }, dedupeKey: `post_clean:${i}:${b.id}`, sendAt,
      });
    }
  }
  return out;
}

// ── 6. After a rating: Google review (4-5★) or recovery (≤3★) ──────────────
async function scanRatings(c: Ctx): Promise<EnqueueInput[]> {
  const wantReview = on(c, "review_request");
  const wantRecovery = on(c, "rating_recovery");
  if (!wantReview && !wantRecovery) return [];
  const { data: rs } = await c.db.from("ratings").select("id, rating, created_at, booking:bookings(id, reference, service_type, customer:customers(id, full_name, email))").gte("created_at", new Date(c.now.getTime() - 7 * DAY).toISOString()).limit(200);
  const out: EnqueueInput[] = [];
  for (const r of rs ?? []) {
    const b = one<any>(r.booking);
    const cust = one<any>(b?.customer);
    if (!b || !cust?.email) continue;
    const key = r.rating >= 4 ? "review_request" : "rating_recovery";
    if ((key === "review_request" && !wantReview) || (key === "rating_recovery" && !wantRecovery)) continue;
    for (const [i, s] of steps(c, key).entries()) {
      const sendAt = new Date(new Date(r.created_at).getTime() + s.hours * H);
      if (!inWindow(c, sendAt, 7 * DAY)) continue;
      out.push({
        templateKey: s.template, category: category(c, s.template), to: cust.email, customerId: cust.id, bookingId: b.id, automationKey: key,
        vars: { firstName: first(cust.full_name), reference: b.reference, serviceLower: lower(b.service_type), rating: r.rating },
        dedupeKey: `${key}:${i}:${r.id}`, sendAt,
      });
    }
  }
  return out;
}

// ── 7. Lifecycle: regular upsell, rebook, win-back ─────────────────────────
async function scanLifecycle(c: Ctx): Promise<EnqueueInput[]> {
  const keys = ["upsell_recurring", "rebook", "winback"].filter((k) => on(c, k));
  if (!keys.length) return [];
  const { data: bs } = await c.db.from("bookings").select("id, reference, service_type, frequency, clean_date, parent_booking_id, customer:customers(id, full_name, email)")
    .in("status", COMPLETED).not("clean_date", "is", null).gte("clean_date", plusDays(c.today, -200)).lte("clean_date", c.today).order("clean_date", { ascending: false }).limit(1000);
  const latest = new Map<string, any>();
  const recurring = new Set<string>();
  for (const b of bs ?? []) {
    const cust = one<any>(b.customer);
    if (!cust?.id) continue;
    if (b.frequency !== "one_off" || b.parent_booking_id) recurring.add(cust.id);
    if (!latest.has(cust.id)) latest.set(cust.id, b); // ordered newest first
  }
  const ids = [...latest.keys()].filter((id) => !recurring.has(id)); // regular customers already get a clean every week
  if (!ids.length) return [];
  // Anyone with a live booking dated after their last clean (or created since) is already coming back.
  const { data: later } = await c.db.from("bookings").select("id, customer_id, clean_date, created_at").in("customer_id", ids).not("status", "in", `(${DEAD_STATUSES.join(",")})`);
  const out: EnqueueInput[] = [];
  for (const id of ids) {
    const b = latest.get(id);
    const anchor = new Date(`${b.clean_date}T12:00:00Z`);
    const comingBack = (later ?? []).some((x: any) => x.customer_id === id && x.id !== b.id && ((x.clean_date && x.clean_date > b.clean_date) || new Date(x.created_at) >= anchor));
    if (comingBack) continue;
    const cust = one<any>(b.customer);
    if (!cust?.email) continue;
    for (const key of keys) {
      if (key === "upsell_recurring" && !["deep_cleaning", "regular_cleaning"].includes(b.service_type)) continue;
      if (key === "rebook" && !["deep_cleaning", "regular_cleaning", "office_cleaning"].includes(b.service_type)) continue;
      for (const [i, s] of steps(c, key).entries()) {
        const sendAt = new Date(anchor.getTime() + s.hours * H);
        if (!inWindow(c, sendAt, 14 * DAY)) continue;
        out.push({
          templateKey: s.template, category: category(c, s.template), to: cust.email, customerId: cust.id, bookingId: b.id, automationKey: key,
          vars: { firstName: first(cust.full_name), reference: b.reference, serviceLabel: label(b.service_type), serviceLower: lower(b.service_type), cleanDate: formatDate(b.clean_date), bookingLink: bookingLink(b.service_type), regularLink: regularLink() },
          guard: { noNewBooking: { customerId: id, after: anchor.toISOString(), afterDate: b.clean_date, excludeBookingId: b.id } },
          dedupeKey: `${key}:${i}:${b.id}`, sendAt,
        });
      }
    }
  }
  return out;
}

/** Schedules every email that has become due. Safe to run as often as you like. */
export async function scanJourneys(now: Date = new Date()): Promise<Record<string, number | string>> {
  await ensureSeeded();
  const [autos, tpls] = await Promise.all([loadAutomations(), loadTemplates()]);
  const ctx: Ctx = { db: createAdminClient(), now, today: todayInLondon(now), autos, tpls };
  const scans: [string, () => Promise<EnqueueInput[]>][] = [
    ["missed_call", () => scanMissedCall(ctx)], ["abandoned", () => scanAbandoned(ctx)],
    ["quote_close_file", () => scanQuotes(ctx, "quote_close_file")], ["quote_winback", () => scanQuotes(ctx, "quote_winback")],
    ["prep", () => scanPrep(ctx)], ["post_clean", () => scanPostClean(ctx)], ["ratings", () => scanRatings(ctx)], ["lifecycle", () => scanLifecycle(ctx)],
  ];
  const result: Record<string, number | string> = {};
  for (const [name, run] of scans) {
    try {
      result[name] = await enqueue(await run());
    } catch (e) {
      // one journey failing must not stop the others
      result[name] = `error: ${e instanceof Error ? e.message : String(e)}`;
    }
  }
  return result;
}
