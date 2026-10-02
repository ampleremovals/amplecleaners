import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/server";
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
  const { data: booking } = await supabase.from("bookings").select("status").eq("id", params.id).maybeSingle();
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

  return NextResponse.json({ success: true });
}
