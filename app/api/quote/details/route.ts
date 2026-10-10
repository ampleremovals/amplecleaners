import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { verifyQuoteConfirmToken } from "@/lib/tokens";
import { depositFor, DEPOSIT_PERCENTAGE } from "@/lib/deposit";
import { SERVICE_LABELS, type ServiceType } from "@/types";

export const runtime = "nodejs";

/** Quote links stay valid for 30 days. */
const TOKEN_EXPIRY_HOURS = 24 * 30;

/** Statuses reached only after the customer has reserved — `deposit_amount`
 *  is a real invoiced figure from that point on, not a creation-time estimate. */
const RESERVED_STATUSES = new Set([
  "deposit_invoice_sent", "booking_confirmed", "cleaner_assigned",
  "in_progress", "job_completed", "invoice_sent", "paid",
]);

/**
 * POST /api/quote/details — the stored quote for a booking, for the
 * customer-facing quote page. Public (no login) — authorised by the signed
 * token. No tiers: one price, one deposit.
 */
export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, "quote-details", 60, 600);
  if (limited) return limited;
  try {
    const { bookingId, token } = await req.json();
    if (!bookingId || !token) return NextResponse.json({ success: false, error: "Missing booking or token" }, { status: 400 });
    if (!verifyQuoteConfirmToken(bookingId, token, TOKEN_EXPIRY_HOURS)) {
      return NextResponse.json({ success: false, error: "This quote link is invalid or has expired." }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { data: booking, error } = await supabase
      .from("bookings")
      .select(`
        reference, service_type, status, quote_total, quote_line_items,
        deposit_percentage, deposit_amount, deposit_status, deposit_required,
        clean_date, is_flexible_date, property_type, bedrooms, bathrooms,
        quote_view_count, quote_first_viewed_at, quote_last_viewed_at,
        customer:customers!inner(full_name)
      `)
      .eq("id", bookingId)
      .single();
    if (error || !booking) return NextResponse.json({ success: false, error: "Quote not found" }, { status: 404 });

    // Count a visit when the customer opens their quote (a reload within 30 minutes is the same visit). Best effort.
    try {
      const nowIso = new Date().toISOString();
      const lastSeen = booking.quote_last_viewed_at ? new Date(booking.quote_last_viewed_at).getTime() : 0;
      const newVisit = Date.now() - lastSeen > 30 * 60_000;
      await supabase.from("bookings").update({
        quote_last_viewed_at: nowIso,
        quote_first_viewed_at: booking.quote_first_viewed_at ?? nowIso,
        ...(newVisit ? { quote_view_count: (booking.quote_view_count ?? 0) + 1 } : {}),
      }).eq("id", bookingId);
    } catch { /* tracking must never break the quote page */ }

    const customer = Array.isArray(booking.customer) ? booking.customer[0] : booking.customer;
    const firstName = (customer?.full_name ?? "there").split(" ")[0];
    const total = Number(booking.quote_total) || 0;
    const depositPercentage = Number(booking.deposit_percentage) || DEPOSIT_PERCENTAGE;

    return NextResponse.json({
      success: true,
      reference: booking.reference,
      serviceType: booking.service_type,
      serviceLabel: SERVICE_LABELS[booking.service_type as ServiceType],
      firstName,
      status: booking.status,
      total,
      lines: Array.isArray(booking.quote_line_items) ? booking.quote_line_items : [],
      depositRequired: booking.deposit_required !== false,
      depositPercentage,
      deposit: RESERVED_STATUSES.has(booking.status as string) && booking.deposit_amount != null
        ? Number(booking.deposit_amount)
        : depositFor(total, depositPercentage),
      depositStatus: booking.deposit_status ?? "unpaid",
      cleanDate: booking.clean_date,
      isFlexibleDate: booking.is_flexible_date,
      hasQuote: total > 0,
    });
  } catch (err) {
    console.error("quote/details error:", err);
    return NextResponse.json({ success: false, error: "Something went wrong" }, { status: 500 });
  }
}
