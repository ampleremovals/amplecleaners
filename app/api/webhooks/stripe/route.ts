import { NextResponse, type NextRequest } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { settleInvoice } from "@/lib/bookings/settle";
import { logError } from "@/lib/log-error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stripe webhook — verifies the signature, then hands a succeeded payment to
 * `settleInvoice` (the single place payments turn into booking state, shared
 * with the admin's bank-transfer "mark paid"). Idempotent: Stripe retries are
 * harmless.
 */
export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  const body = await request.text();

  const secrets = [process.env.STRIPE_WEBHOOK_SECRET, process.env.STRIPE_WEBHOOK_SECRET_TEST]
    .filter((s): s is string => !!s && !s.startsWith("your_"));
  if (!secrets.length || !signature) {
    return NextResponse.json({ received: true, configured: false });
  }

  let event: Stripe.Event | null = null;
  for (const secret of secrets) {
    try { event = stripe.webhooks.constructEvent(body, signature, secret); break; } catch { /* try next secret */ }
  }
  if (!event) return NextResponse.json({ error: "Webhook signature verification failed" }, { status: 400 });

  try {
    if (event.type === "payment_intent.succeeded") {
      const pi = event.data.object as Stripe.PaymentIntent;
      const invoiceId = pi.metadata?.invoice_id;
      if (invoiceId) {
        await settleInvoice(invoiceId, {
          method: "stripe",
          actor: "system",
          stripePaymentIntentId: pi.id,
          // Card payments include the pass-through fee; the invoice amount is what's credited.
        });
      }
    }
    return NextResponse.json({ received: true });
  } catch (err) {
    await logError({ message: "stripe webhook failed", metadata: { error: String(err) } });
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
