import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { verifyQuoteConfirmToken } from "@/lib/tokens";
import { stripe, stripeTest } from "@/lib/stripe";
import { cardTotalForNet } from "@/lib/stripe-fees";
import { depositFor } from "@/lib/deposit";
import { getOrCreateBookingInvoice } from "@/lib/bookings/booking-invoice";

export const runtime = "nodejs";
const TOKEN_EXPIRY_HOURS = 24 * 30;

/**
 * POST /api/quote/[bookingId]/pay — start a Stripe Checkout for the deposit,
 * straight from the quote page. Token-guarded (no login). Card carries the
 * processing fee on top so the full deposit reaches us.
 */
export async function POST(req: NextRequest, { params }: { params: { bookingId: string } }) {
  try {
    const { token } = (await req.json()) as { token?: string };
    const bookingId = params.bookingId;
    if (!token || !bookingId) return NextResponse.json({ success: false, error: "Missing or invalid request." }, { status: 400 });
    if (!verifyQuoteConfirmToken(bookingId, token, TOKEN_EXPIRY_HOURS)) {
      return NextResponse.json({ success: false, error: "This link is invalid or has expired." }, { status: 401 });
    }

    const useTest = new URL(req.url).searchParams.get("test") === "1" && !!stripeTest;
    const client = useTest ? stripeTest! : stripe;
    if (!useTest && !process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ success: false, error: "Online payments aren't set up yet." }, { status: 503 });
    }

    const supabase = createAdminClient();
    const { data: booking } = await supabase
      .from("bookings")
      .select("id, reference, quote_total, deposit_amount, deposit_percentage, customer_id, customer:customers!inner(full_name, email)")
      .eq("id", bookingId)
      .single();
    if (!booking) return NextResponse.json({ success: false, error: "Booking not found." }, { status: 404 });

    const quoteTotal = Number(booking.quote_total) || 0;
    if (quoteTotal < 1) return NextResponse.json({ success: false, error: "Your quote isn't ready yet." }, { status: 400 });

    const customer = Array.isArray(booking.customer) ? booking.customer[0] : booking.customer;
    const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.amplecleaners.com";
    const testQ = useTest ? "?test=1" : "";

    const net = Number(booking.deposit_amount) || depositFor(quoteTotal, Number(booking.deposit_percentage) || undefined);
    const invoice = await getOrCreateBookingInvoice(supabase, {
      bookingId, customerId: booking.customer_id as string, type: "deposit", net,
      description: `Ample Cleaners — deposit to reserve (${booking.reference})`,
    });

    const amountPence = Math.round(net * 100);
    const line_items: { price_data: { currency: string; product_data: { name: string }; unit_amount: number }; quantity: number }[] = [{
      price_data: { currency: "gbp", product_data: { name: `Ample Cleaners — deposit (${booking.reference})` }, unit_amount: amountPence },
      quantity: 1,
    }];

    const { fee } = cardTotalForNet(net);
    const feePence = Math.round(fee * 100);
    if (feePence > 0) {
      line_items.push({
        price_data: { currency: "gbp", product_data: { name: "Card processing fee (so your full deposit reaches us)" }, unit_amount: feePence },
        quantity: 1,
      });
    }

    const session = await client.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items,
      payment_intent_data: { metadata: { invoice_id: invoice.invoiceId }, description: `${booking.reference} — deposit` },
      metadata: { invoice_id: invoice.invoiceId, booking_id: bookingId },
      customer_email: customer?.email ?? undefined,
      success_url: `${site}/quote/${bookingId}/${token}?paid=1${useTest ? "&test=1" : ""}`,
      cancel_url: `${site}/quote/${bookingId}/${token}${testQ}`,
    });

    return NextResponse.json({ success: true, url: session.url });
  } catch (e) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : "Couldn't start payment." }, { status: 500 });
  }
}
