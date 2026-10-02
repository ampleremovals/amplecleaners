import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/server";
import { generateQuoteConfirmToken } from "@/lib/tokens";
import { markQuoteSent, sendQuoteMessages } from "@/lib/bookings/quoteDelivery";
import type { ServiceType } from "@/types";

/**
 * POST /api/admin/bookings/[id]/quote/send — sends the quote already saved
 * via PATCH .../quote. Single path for all 5 services (no tiers to branch
 * on). Lands the customer on /quote/[bookingId]/[token] with the
 * "pay deposit to secure your date" CTA — no confirm-first step.
 */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const supabase = createAdminClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, reference, status, service_type, quote_total, deposit_percentage, customer:customers(full_name, email, phone)")
    .eq("id", params.id)
    .maybeSingle();
  if (!booking) return NextResponse.json({ success: false, error: "Booking not found" }, { status: 404 });
  if (!booking.quote_total) return NextResponse.json({ success: false, error: "Save a quote first" }, { status: 400 });

  const customer = Array.isArray(booking.customer) ? booking.customer[0] : booking.customer;
  if (!customer?.email || !customer?.phone) {
    return NextResponse.json({ success: false, error: "Customer is missing an email or phone" }, { status: 400 });
  }

  const token = generateQuoteConfirmToken(params.id);
  if (!token) return NextResponse.json({ success: false, error: "QUOTE_CONFIRM_SECRET isn't configured" }, { status: 500 });

  try {
    await markQuoteSent(supabase, params.id, booking.status as string);
    await sendQuoteMessages({
      bookingId: params.id,
      token,
      reference: booking.reference as string,
      serviceType: booking.service_type as ServiceType,
      firstName: (customer.full_name ?? "there").split(" ")[0],
      email: customer.email,
      phone: customer.phone,
      total: Number(booking.quote_total),
      depositPercentage: Number(booking.deposit_percentage) || 20,
    });
  } catch (err) {
    await supabase.from("server_logs").insert({ level: "error", message: "quote send failed", metadata: { bookingId: params.id, error: String(err) } });
    return NextResponse.json({ success: false, error: "Saved, but sending failed — try again" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
