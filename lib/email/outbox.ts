/* eslint-disable @typescript-eslint/no-explicit-any -- untyped Supabase client */
import { createAdminClient } from "@/lib/supabase/server";
import { isErasedAddress } from "@/lib/email/suppression";

export interface Guard {
  /** The booking must (still) be in one of these statuses when the email is about to go out. */
  statusIn?: string[];
  /** The booking must not have been rated yet. */
  notRated?: boolean;
  /** The abandoned-form lead must not have turned into a booking. */
  leadId?: string;
  /** The customer must have no other live booking created since `after` or dated after `afterDate`. */
  /** Skip if we have emailed this address in the last N hours (stops two systems nudging the same person at once). */
  quietForHours?: number;
  noNewBooking?: { customerId: string; after: string; afterDate: string; excludeBookingId?: string };
}

export interface EnqueueInput {
  templateKey: string;
  category: "service" | "marketing";
  to: string;
  customerId?: string | null;
  bookingId?: string | null;
  automationKey?: string | null;
  campaignId?: string | null;
  vars: Record<string, string | number | null>;
  guard?: Guard;
  /** Same key = same email: a second enqueue is ignored, so scanning every few minutes never double-sends. */
  dedupeKey?: string;
  sendAt?: Date;
}

/** Schedules emails. Returns how many were newly queued (duplicates by `dedupeKey` are ignored). */
export async function enqueue(allItems: EnqueueInput[]): Promise<number> {
  const items = allItems.filter((i) => !isErasedAddress(i.to)); // erased customers keep a placeholder address; never queue mail for it
  if (!items.length) return 0;
  const rows = items.map((i) => ({
    template_key: i.templateKey, category: i.category, to_email: i.to.trim().toLowerCase(),
    customer_id: i.customerId ?? null, booking_id: i.bookingId ?? null, automation_key: i.automationKey ?? null, campaign_id: i.campaignId ?? null,
    vars: i.vars, guard: i.guard ?? {}, dedupe_key: i.dedupeKey ?? null, send_at: (i.sendAt ?? new Date()).toISOString(), status: "scheduled",
  }));
  const withKey = rows.filter((r) => r.dedupe_key);
  const without = rows.filter((r) => !r.dedupe_key);
  const db: any = createAdminClient();
  let n = 0;
  if (withKey.length) {
    const { data, error } = await db.from("email_outbox").upsert(withKey, { onConflict: "dedupe_key", ignoreDuplicates: true }).select("id");
    if (error) throw new Error(`enqueue failed: ${error.message}`);
    n += data?.length ?? 0;
  }
  if (without.length) {
    const { data, error } = await db.from("email_outbox").insert(without).select("id");
    if (error) throw new Error(`enqueue failed: ${error.message}`);
    n += data?.length ?? 0;
  }
  return n;
}

/**
 * Records an email that was sent directly by older code (quote, invoice, reminders…) so the Send log and
 * the delivery webhook cover EVERY email the platform sends, not just the new journeys. Never throws.
 */
export async function recordDirectSend(p: { to: string | string[]; subject: string; context: string; resendId?: string | null; error?: string | null }): Promise<void> {
  if (process.env.DISABLE_OUTBOUND_MESSAGES === "1") return; // test runs: no mail, so no log
  try {
    const to = (Array.isArray(p.to) ? p.to[0] : p.to)?.trim().toLowerCase();
    if (!to) return;
    await (createAdminClient() as any).from("email_outbox").insert({
      template_key: p.context.slice(0, 80) || "system", category: "system", to_email: to, subject: p.subject.slice(0, 300),
      status: p.error ? "failed" : "sent", status_note: p.error?.slice(0, 300) ?? null, sent_at: new Date().toISOString(), resend_id: p.resendId ?? null,
      attempts: 1,
    });
  } catch { /* the send log must never break sending */ }
}
