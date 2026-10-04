import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/server";
import { processJobCompletion } from "@/lib/bookings/completion";
import { autoAssignBooking } from "@/lib/automation/autoAssign";
import { cancelFutureVisits } from "@/lib/automation/recurrence";
import { todayInLondon } from "@/lib/cleaner-auth";
import type { BookingStatus } from "@/types";

const VALID_STATUSES: BookingStatus[] = [
  "inquiry", "called", "not_called", "answered", "not_answered",
  "quote_sent", "deposit_invoice_sent", "booking_confirmed",
  "cleaner_assigned", "in_progress", "job_completed",
  "invoice_sent", "paid", "bad_lead", "not_a_good_fit", "cancelled",
];

/**
 * PATCH /api/admin/bookings/[id]/status — move a booking to a new status
 * (used by the pipeline board's drag-and-drop). Every change writes
 * status_history + activity_log — no silent status changes, same discipline
 * as Ample Removals.
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null) as { status?: string } | null;
  const newStatus = body?.status as BookingStatus | undefined;
  if (!newStatus || !VALID_STATUSES.includes(newStatus)) {
    return NextResponse.json({ success: false, error: "Invalid status" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: booking } = await supabase.from("bookings").select("status, parent_booking_id").eq("id", params.id).maybeSingle();
  if (!booking) return NextResponse.json({ success: false, error: "Booking not found" }, { status: 404 });

  const { error } = await supabase.from("bookings").update({ status: newStatus }).eq("id", params.id);
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

  await Promise.allSettled([
    supabase.from("status_history").insert({
      booking_id: params.id, previous_status: booking.status, new_status: newStatus, changed_by: "admin",
    }),
    supabase.from("activity_log").insert({
      booking_id: params.id, action: `Status changed: ${booking.status} → ${newStatus}`, performed_by: "admin",
    }),
  ]);

  // Same automation whether a cleaner clocks out or an admin drags the card:
  // completing a job bills the customer; cancelling a series root cancels its future visits.
  let invoiced = false;
  let cancelledVisits = 0;
  if (newStatus === "job_completed") {
    const result = await processJobCompletion(params.id);
    invoiced = result.done;
  } else if (newStatus === "booking_confirmed") {
    await autoAssignBooking(params.id, "system");
  } else if ((newStatus === "cancelled" || newStatus === "bad_lead" || newStatus === "not_a_good_fit") && !booking.parent_booking_id) {
    cancelledVisits = await cancelFutureVisits(params.id, todayInLondon());
  }

  return NextResponse.json({ success: true, invoiced, cancelledVisits });
}
