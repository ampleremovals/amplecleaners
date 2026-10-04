import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/server";
import { afterBookingCreated, bookingInputSchema, createBooking } from "@/lib/bookings/create";

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
      assigned_cleaner_id, created_at, is_flagged, parent_booking_id,
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

/**
 * POST /api/admin/bookings — create a booking on a customer's behalf (phone /
 * WhatsApp enquiries). Same creation path as the public form, tagged
 * `source: phone`. `sendQuote` decides whether the customer is messaged
 * straight away (only possible when the booking is priced).
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const parsed = bookingInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }
  try {
    const booking = await createBooking(parsed.data, "phone", "admin");
    await afterBookingCreated(booking.id, { alertAdmin: false, messageCustomer: body?.sendQuote === true });
    return NextResponse.json({ success: true, id: booking.id, reference: booking.reference, total: booking.total });
  } catch (e) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : "Couldn't create the booking" }, { status: 500 });
  }
}
