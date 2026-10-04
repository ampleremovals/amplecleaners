/* eslint-disable @typescript-eslint/no-explicit-any -- untyped Supabase client */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/server";
import { getOrCreateBookingInvoice } from "@/lib/bookings/booking-invoice";
import { settleInvoice } from "@/lib/bookings/settle";
import { depositFor } from "@/lib/deposit";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * POST /api/admin/bookings/[id]/verify-deposit — the admin has seen the bank
 * transfer land. Settles the deposit invoice exactly like a card payment would
 * (booking_confirmed → messages → auto-assign).
 */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const supabase: any = createAdminClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, reference, customer_id, quote_total, deposit_amount, deposit_percentage, deposit_status")
    .eq("id", params.id)
    .maybeSingle();
  if (!booking) return NextResponse.json({ success: false, error: "Booking not found" }, { status: 404 });
  if (booking.deposit_status === "verified") return NextResponse.json({ success: false, error: "Deposit is already verified" }, { status: 409 });

  const net = Number(booking.deposit_amount) || depositFor(Number(booking.quote_total) || 0, Number(booking.deposit_percentage) || undefined);
  if (net <= 0) return NextResponse.json({ success: false, error: "This booking has no deposit amount" }, { status: 400 });

  const invoice = await getOrCreateBookingInvoice(supabase, {
    bookingId: booking.id, customerId: booking.customer_id, type: "deposit", net,
    description: `Ample Cleaners — deposit to reserve (${booking.reference})`,
  });
  const result = await settleInvoice(invoice.invoiceId, { method: "bank_transfer", actor: "admin" });
  if (!result.settled) return NextResponse.json({ success: false, error: result.reason }, { status: 409 });
  return NextResponse.json({ success: true });
}
