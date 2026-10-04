import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/server";
import { notifyJobAssigned } from "@/lib/automation/autoAssign";

/**
 * PATCH /api/admin/bookings/[id]/assign-cleaner — assign (or reassign) a
 * cleaner to a booking. Advances status to `cleaner_assigned` if the booking
 * was previously `booking_confirmed` (the normal path); doesn't move it
 * backwards if it's already further along (e.g. reassigning mid-job).
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null) as { cleanerId?: string | null } | null;
  if (body?.cleanerId === undefined) {
    return NextResponse.json({ success: false, error: "Missing cleanerId" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: booking } = await supabase.from("bookings").select("status, reference").eq("id", params.id).maybeSingle();
  if (!booking) return NextResponse.json({ success: false, error: "Booking not found" }, { status: 404 });

  const nextStatus = booking.status === "booking_confirmed" ? "cleaner_assigned" : booking.status;

  const { error } = await supabase
    .from("bookings")
    .update({ assigned_cleaner_id: body.cleanerId, status: nextStatus })
    .eq("id", params.id);
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

  let cleanerName: string | null = null;
  if (body.cleanerId) {
    const { data: cleaner } = await supabase.from("cleaners").select("full_name").eq("id", body.cleanerId).maybeSingle();
    cleanerName = cleaner?.full_name ?? null;
  }

  await Promise.allSettled([
    nextStatus !== booking.status
      ? supabase.from("status_history").insert({ booking_id: params.id, previous_status: booking.status, new_status: nextStatus, changed_by: "admin" })
      : Promise.resolve(),
    supabase.from("activity_log").insert({
      booking_id: params.id,
      action: body.cleanerId ? `Cleaner assigned: ${cleanerName ?? body.cleanerId}` : "Cleaner unassigned",
      performed_by: "admin",
    }),
  ]);

  if (body.cleanerId) await notifyJobAssigned(params.id, body.cleanerId);

  return NextResponse.json({ success: true });
}
