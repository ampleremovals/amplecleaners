import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { verifyQuoteConfirmToken } from "@/lib/tokens";
import { sendEmail, resendAdminEmail } from "@/lib/resend";

export const runtime = "nodejs";
const TOKEN_EXPIRY_HOURS = 24 * 30;

/**
 * POST /api/deposit/claim — the customer declares they've made the bank
 * transfer. Recorded as "claimed" (pending team verification); never
 * auto-marked paid — a human confirms the money actually landed.
 */
export async function POST(req: NextRequest) {
  try {
    const { bookingId, token } = await req.json();
    if (!bookingId || !token) return NextResponse.json({ success: false, error: "Missing booking or token" }, { status: 400 });
    if (!verifyQuoteConfirmToken(bookingId, token, TOKEN_EXPIRY_HOURS)) {
      return NextResponse.json({ success: false, error: "This link is invalid or has expired." }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { data: booking, error } = await supabase
      .from("bookings")
      .select("reference, deposit_amount, customer:customers!inner(full_name)")
      .eq("id", bookingId)
      .single();
    if (error || !booking) return NextResponse.json({ success: false, error: "Booking not found" }, { status: 404 });

    const customer = Array.isArray(booking.customer) ? booking.customer[0] : booking.customer;

    await supabase.from("bookings").update({ deposit_status: "claimed", deposit_claimed_at: new Date().toISOString() }).eq("id", bookingId);
    await supabase.from("activity_log").insert({
      booking_id: bookingId, action: "deposit_claimed", metadata: { reference: booking.reference, deposit_amount: booking.deposit_amount ?? null }, performed_by: "customer",
    });

    const amount = booking.deposit_amount != null ? `£${Number(booking.deposit_amount).toFixed(2)}` : "the deposit";
    await sendEmail({
      to: resendAdminEmail,
      subject: `💷 Deposit claimed — verify transfer (${booking.reference})`,
      html: `<p><strong>${customer?.full_name ?? "A customer"}</strong> says they've paid ${amount} for booking <strong>${booking.reference}</strong>.</p><p>Please check the bank account and confirm the transfer.</p>`,
    }).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("deposit/claim error:", err);
    return NextResponse.json({ success: false, error: "Something went wrong" }, { status: 500 });
  }
}
