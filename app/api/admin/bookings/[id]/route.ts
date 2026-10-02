import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/server";

/** GET /api/admin/bookings/[id] — full booking detail for the CRM record view. */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const supabase = createAdminClient();
  const { data: booking, error } = await supabase
    .from("bookings")
    .select(`
      *,
      customer:customers(id, full_name, email, phone),
      address:addresses(id, line_1, line_2, city, postcode),
      cleaner:cleaners(id, full_name, phone)
    `)
    .eq("id", params.id)
    .maybeSingle();
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  if (!booking) return NextResponse.json({ success: false, error: "Booking not found" }, { status: 404 });

  const [{ data: statusHistory }, { data: activityLog }, { data: invoices }] = await Promise.all([
    supabase.from("status_history").select("*").eq("booking_id", params.id).order("created_at", { ascending: false }),
    supabase.from("activity_log").select("*").eq("booking_id", params.id).order("created_at", { ascending: false }),
    supabase.from("invoices").select("*").eq("booking_id", params.id).order("created_at", { ascending: false }),
  ]);

  return NextResponse.json({
    success: true,
    booking,
    statusHistory: statusHistory ?? [],
    activityLog: activityLog ?? [],
    invoices: invoices ?? [],
  });
}
