/* eslint-disable @typescript-eslint/no-explicit-any -- untyped Supabase client */
import { addDays, addMonths, addWeeks } from "date-fns";
import { createAdminClient } from "@/lib/supabase/server";
import { autoAssignBooking } from "@/lib/automation/autoAssign";
import { resetTasks } from "@/lib/tasks-template";
import { generateBookingReference } from "@/lib/utils";
import { logError } from "@/lib/log-error";
import type { CleaningFrequency, ServiceType } from "@/types";

/** Series keep running only while the ROOT booking is in one of these states. */
const LIVE_ROOT_STATUSES = ["booking_confirmed", "cleaner_assigned", "in_progress", "job_completed", "invoice_sent", "paid"];
export const LOOKAHEAD_DAYS = 14;
const MAX_VISITS_PER_RUN = 4;

const toIso = (d: Date) => d.toISOString().slice(0, 10);
const parse = (iso: string) => new Date(`${iso}T00:00:00Z`);

/** The date of the next visit after `iso` for a given frequency. */
export function advance(iso: string, frequency: CleaningFrequency): string {
  const d = parse(iso);
  if (frequency === "weekly") return toIso(addWeeks(d, 1));
  if (frequency === "fortnightly") return toIso(addWeeks(d, 2));
  if (frequency === "monthly") return toIso(addMonths(d, 1));
  return iso;
}

/**
 * Rolls every live recurring series forward so visits exist `LOOKAHEAD_DAYS`
 * ahead, then auto-assigns each (preferring the series' regular cleaner).
 * Idempotent: the unique (parent_booking_id, clean_date) index makes a double
 * run harmless. A series stops when its root booking is cancelled.
 */
export async function generateRecurringVisits(todayIso: string): Promise<{ created: number; roots: number }> {
  const supabase: any = createAdminClient();
  const horizon = toIso(addDays(parse(todayIso), LOOKAHEAD_DAYS));

  const { data: roots } = await supabase
    .from("bookings")
    .select("*")
    .is("parent_booking_id", null)
    .in("frequency", ["weekly", "fortnightly", "monthly"])
    .in("status", LIVE_ROOT_STATUSES)
    .not("clean_date", "is", null);

  let created = 0;
  for (const root of roots ?? []) {
    try {
      const freq = root.frequency as CleaningFrequency;
      let next: string = root.next_occurrence_date ?? advance(root.clean_date, freq);
      // A series that fell behind (paused/late confirm) resumes from today, never backfills the past.
      for (let guard = 0; next < todayIso && guard < 200; guard++) next = advance(next, freq);

      let madeThisRun = 0;
      while (next <= horizon && madeThisRun < MAX_VISITS_PER_RUN) {
        const childId = await insertVisit(supabase, root, next);
        if (childId) {
          created++;
          madeThisRun++;
          await autoAssignBooking(childId, "system");
        }
        next = advance(next, freq);
      }
      if (next !== root.next_occurrence_date) await supabase.from("bookings").update({ next_occurrence_date: next }).eq("id", root.id);
    } catch (e) {
      await logError({ message: "recurring visit generation failed", metadata: { rootId: root.id, error: String(e) } });
    }
  }
  return { created, roots: roots?.length ?? 0 };
}

async function insertVisit(supabase: any, root: any, cleanDate: string): Promise<string | null> {
  const { data: child, error } = await supabase
    .from("bookings")
    .insert({
      reference: generateBookingReference(root.service_type as ServiceType),
      service_type: root.service_type,
      status: "booking_confirmed",
      customer_id: root.customer_id,
      address_id: root.address_id,
      property_type: root.property_type,
      bedrooms: root.bedrooms,
      bathrooms: root.bathrooms,
      frequency: root.frequency,
      clean_date: cleanDate,
      clean_time: root.clean_time,
      special_instructions: root.special_instructions,
      quote_line_items: root.quote_line_items,
      quote_subtotal: root.quote_subtotal,
      quote_vat_rate: root.quote_vat_rate,
      quote_vat_amount: root.quote_vat_amount,
      quote_total: root.quote_total,
      // Recurring visits are billed after each clean — no deposit.
      deposit_required: false,
      deposit_percentage: root.deposit_percentage,
      tasks: resetTasks(root.tasks, root.service_type),
      parent_booking_id: root.id,
      source: "recurring",
    })
    .select("id, reference")
    .single();

  if (error) {
    if (error.code === "23505") return null; // that visit already exists
    throw new Error(error.message);
  }
  await Promise.allSettled([
    supabase.from("status_history").insert({ booking_id: child.id, previous_status: null, new_status: "booking_confirmed", changed_by: "system", reason: `Recurring visit of ${root.reference}` }),
    supabase.from("activity_log").insert({ booking_id: child.id, action: `Recurring ${root.frequency} visit generated from ${root.reference}`, metadata: { rootId: root.id }, performed_by: "system" }),
  ]);
  return child.id as string;
}

/** When a series root is cancelled, its not-yet-started future visits go with it. */
export async function cancelFutureVisits(rootId: string, todayIso: string): Promise<number> {
  const supabase: any = createAdminClient();
  const { data } = await supabase
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("parent_booking_id", rootId)
    .in("status", ["booking_confirmed", "cleaner_assigned"])
    .gt("clean_date", todayIso)
    .select("id");
  const ids: string[] = (data ?? []).map((r: any) => r.id);
  if (ids.length) {
    await Promise.allSettled(
      ids.flatMap((id) => [
        supabase.from("status_history").insert({ booking_id: id, previous_status: null, new_status: "cancelled", changed_by: "system", reason: "Series cancelled" }),
        supabase.from("activity_log").insert({ booking_id: id, action: "Cancelled — the recurring series was cancelled", performed_by: "system" }),
      ]),
    );
  }
  return ids.length;
}
