import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * GET /api/admin/bookings — list bookings for the pipeline board, optionally
 * filtered by status. Returns the fields the board/cards need, not every
 * column (the detail page fetches the full row separately).
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const supabase = createAdminClient();
  const status = req.nextUrl.searchParams.get("status");

  let query = supabase
    .from("bookings")
    .select(`
      id, reference, service_type, status, clean_date, is_flexible_date, quote_total,
      assigned_cleaner_id, created_at,
      customer:customers(full_name, email, phone),
      cleaner:cleaners(full_name)
    `)
    .order("created_at", { ascending: false })
    .limit(200);

  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, bookings: data ?? [] });
}
