import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("customers")
    .select("id, full_name, email, phone, created_at, bookings(id)")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

  const customers = (data ?? []).map((c) => ({ ...c, booking_count: (c as unknown as { bookings: unknown[] }).bookings?.length ?? 0 }));
  return NextResponse.json({ success: true, customers });
}
