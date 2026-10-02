import { NextResponse, type NextRequest } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/server";
import { sendDepositConfirmedMessages } from "@/lib/bookings/quoteDelivery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stripe webhook — confirms a deposit/full-balance payment and drives the
 * booking status forward. Mirrors Ample Removals' handler, trimmed to what
 * this schema actually has (no separate `payments` table or driver earnings
 * yet — `invoices.paid_at`/`stripe_payment_intent_id` is enough for now).
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

  const supabase = createAdminClient();

  try {
    if (event.type === "payment_intent.succeeded") {
      const pi = event.data.object as Stripe.PaymentIntent;
      const invoiceId = pi.metadata?.invoice_id;
      if (!invoiceId) return NextResponse.json({ received: true });

      const { data: inv } = await supabase
        .from("invoices")
        .select("id, status, type, booking_id, customer_id, total, invoice_number")
        .eq("id", invoiceId)
        .single();
      if (!inv || inv.status === "paid") return NextResponse.json({ received: true }); // idempotent

      const now = new Date().toISOString();
      const amountPaid = pi.amount_received / 100;

      await supabase.from("invoices").update({ status: "paid", paid_at: now, stripe_payment_intent_id: pi.id }).eq("id", invoiceId);

      const { data: booking } = await supabase.from("bookings").select("status, reference, customer_id").eq("id", inv.booking_id).single();
      const newStatus = inv.type === "deposit" ? "booking_confirmed" : "paid";

      await supabase.from("bookings").update({ status: newStatus }).eq("id", inv.booking_id);
      await supabase.from("status_history").insert({
        booking_id: inv.booking_id, previous_status: booking?.status ?? null, new_status: newStatus, changed_by: "system",
      });
      await supabase.from("activity_log").insert({
        booking_id: inv.booking_id,
        action: `Payment received via Stripe for invoice ${inv.invoice_number} — £${amountPaid.toFixed(2)}`,
        metadata: { invoiceId, stripePaymentIntentId: pi.id, amount: amountPaid },
        performed_by: "system",
      });

      if (inv.type === "deposit" && booking) {
        const { data: customer } = await supabase.from("customers").select("full_name, email, phone").eq("id", inv.customer_id).single();
        if (customer) {
          await sendDepositConfirmedMessages({
            reference: booking.reference as string,
            firstName: (customer.full_name ?? "there").split(" ")[0],
            email: customer.email, phone: customer.phone,
          }).catch(() => {});
        }
      }
    }
    return NextResponse.json({ received: true });
  } catch (err) {
    try {
      await supabase.from("server_logs").insert({ level: "error", message: "stripe webhook failed", metadata: { error: String(err) } });
    } catch { /* logging must never mask the original error */ }
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
