import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { verifyQuoteConfirmToken } from "@/lib/tokens";
import { depositFor } from "@/lib/deposit";
import { sendDepositMessages } from "@/lib/bookings/quoteDelivery";
import { getOrCreateBookingInvoice } from "@/lib/bookings/booking-invoice";

export const runtime = "nodejs";
const TOKEN_EXPIRY_HOURS = 24 * 30;

/**
 * POST /api/quote/reserve — the customer has clicked "Pay deposit to secure
 * your date." `quote_total` (set by the admin, never recomputed here — see
 * tasks/lessons.md Lesson 1) is the single source of truth for the price.
 * Creates the deposit invoice immediately (not lazily on payment attempt —
 * Lesson from Ample Removals' follow-up ladder gap), moves the booking to
 * `deposit_invoice_sent`, and sends the deposit payment details.
 */
export async function POST(req: NextRequest) {
  try {
    const { bookingId, token } = await req.json();
    if (!bookingId || !token) return NextResponse.json({ success: false, error: "Missing booking or token" }, { status: 400 });
    if (!verifyQuoteConfirmToken(bookingId, token, TOKEN_EXPIRY_HOURS)) {
      return NextResponse.json({ success: false, error: "This quote link is invalid or has expired." }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { data: booking, error } = await supabase
      .from("bookings")
      .select("status, reference, customer_id, quote_total, deposit_percentage, customer:customers!inner(full_name, email, phone)")
      .eq("id", bookingId)
      .single();
    if (error || !booking) return NextResponse.json({ success: false, error: "Quote not found" }, { status: 404 });

    const total = Number(booking.quote_total) || 0;
    if (total <= 0) return NextResponse.json({ success: false, error: "This quote isn't ready yet." }, { status: 400 });

    const deposit = depositFor(total, Number(booking.deposit_percentage) || undefined);

    const { error: updErr } = await supabase
      .from("bookings")
      .update({ deposit_amount: deposit, status: "deposit_invoice_sent" })
      .eq("id", bookingId);
    if (updErr) return NextResponse.json({ success: false, error: "Couldn't reserve your date. Please try again." }, { status: 500 });

    try {
      await supabase.from("bookings").update({
        deposit_followup_started_at: new Date().toISOString(),
        deposit_followup_last_morning_sent_on: null, deposit_followup_last_evening_sent_on: null,
      }).eq("id", bookingId);
    } catch (e) {
      console.warn("reserve: follow-up fields skipped (migration may not be applied yet):", e);
    }

    await Promise.allSettled([
      supabase.from("status_history").insert({ booking_id: bookingId, previous_status: booking.status, new_status: "deposit_invoice_sent", changed_by: "customer" }),
      supabase.from("activity_log").insert({ booking_id: bookingId, action: "Customer reserved their date — deposit invoice sent", metadata: { total, deposit }, performed_by: "customer" }),
    ]);

    try {
      await getOrCreateBookingInvoice(supabase, {
        bookingId,
        customerId: booking.customer_id as string,
        type: "deposit",
        net: deposit,
        description: `Ample Cleaners — deposit to reserve (${booking.reference})`,
      });
    } catch (e) {
      console.warn("reserve: eager deposit invoice creation failed:", e);
    }

    const customer = Array.isArray(booking.customer) ? booking.customer[0] : booking.customer;
    if (customer) {
      await sendDepositMessages({
        bookingId, token, reference: booking.reference as string,
        firstName: (customer.full_name ?? "there").split(" ")[0],
        email: customer.email, phone: customer.phone, deposit,
      });
    }

    return NextResponse.json({ success: true, total, deposit });
  } catch (err) {
    console.error("quote/reserve error:", err);
    return NextResponse.json({ success: false, error: "Something went wrong" }, { status: 500 });
  }
}
