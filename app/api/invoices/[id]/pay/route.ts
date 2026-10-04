/* eslint-disable @typescript-eslint/no-explicit-any -- untyped Supabase client */
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import { verifyInvoiceToken } from "@/lib/tokens";
import { stripe, stripeTest } from "@/lib/stripe";
import { cardTotalForNet } from "@/lib/stripe-fees";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * POST /api/invoices/[id]/pay — Stripe Checkout for a balance / per-visit
 * invoice. Same card-fee pass-through as the deposit flow, so the invoice
 * amount reaches us in full. Payment is confirmed by the Stripe webhook (the
 * browser redirect alone never marks anything paid).
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const limited = await rateLimit(req, "invoice-pay", 20, 600);
  if (limited) return limited;

  try {
    const { token } = z.object({ token: z.string().min(10) }).parse(await req.json().catch(() => ({})));
    if (!z.string().uuid().safeParse(params.id).success || !verifyInvoiceToken(params.id, token)) {
      return NextResponse.json({ success: false, error: "This link is invalid." }, { status: 401 });
    }

    const useTest = new URL(req.url).searchParams.get("test") === "1" && !!stripeTest;
    const client = useTest ? stripeTest! : stripe;
    if (!useTest && !process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ success: false, error: "Online card payments aren't set up yet — please pay by bank transfer or call us." }, { status: 503 });
    }

    const supabase: any = createAdminClient();
    const { data: inv } = await supabase
      .from("invoices")
      .select("id, invoice_number, status, total, type, customer:customers(email), booking:bookings(reference)")
      .eq("id", params.id)
      .maybeSingle();
    if (!inv) return NextResponse.json({ success: false, error: "Invoice not found." }, { status: 404 });
    if (inv.status === "paid") return NextResponse.json({ success: false, error: "This invoice is already paid — thank you!" }, { status: 409 });
    if (inv.status === "cancelled") return NextResponse.json({ success: false, error: "This invoice was cancelled." }, { status: 410 });

    const net = Number(inv.total);
    if (net < 1) return NextResponse.json({ success: false, error: "Nothing to pay on this invoice." }, { status: 400 });
    const customer = Array.isArray(inv.customer) ? inv.customer[0] : inv.customer;
    const booking = Array.isArray(inv.booking) ? inv.booking[0] : inv.booking;
    const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.amplecleaners.com";
    const testQ = useTest ? "?test=1" : "";

    const lineItems: { price_data: { currency: string; product_data: { name: string }; unit_amount: number }; quantity: number }[] = [{
      price_data: { currency: "gbp", product_data: { name: `Ample Cleaners — invoice ${inv.invoice_number}` }, unit_amount: Math.round(net * 100) },
      quantity: 1,
    }];
    const { fee } = cardTotalForNet(net);
    if (fee > 0) {
      lineItems.push({
        price_data: { currency: "gbp", product_data: { name: "Card processing fee" }, unit_amount: Math.round(fee * 100) },
        quantity: 1,
      });
    }

    const session = await client.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: lineItems,
      payment_intent_data: { metadata: { invoice_id: inv.id }, description: `${booking?.reference ?? ""} — ${inv.invoice_number}` },
      metadata: { invoice_id: inv.id },
      customer_email: customer?.email ?? undefined,
      success_url: `${site}/pay/${inv.id}/${token}?paid=1${useTest ? "&test=1" : ""}`,
      cancel_url: `${site}/pay/${inv.id}/${token}${testQ}`,
    });
    return NextResponse.json({ success: true, url: session.url });
  } catch (e) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : "Couldn't start payment." }, { status: 500 });
  }
}
