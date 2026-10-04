/* eslint-disable @typescript-eslint/no-explicit-any -- untyped Supabase client */
import { createAdminClient } from "@/lib/supabase/server";
import { sendDepositConfirmedMessages } from "@/lib/bookings/quoteDelivery";
import { sendPaymentReceiptMessages } from "@/lib/bookings/invoiceDelivery";
import { autoAssignBooking } from "@/lib/automation/autoAssign";
import { generateQuoteConfirmToken } from "@/lib/tokens";
import { logError } from "@/lib/log-error";

/** Statuses a booking can still be in when its deposit lands (i.e. not yet confirmed). */
const PRE_CONFIRMATION = ["inquiry", "called", "not_called", "answered", "not_answered", "quote_sent", "deposit_invoice_sent"];

export interface SettleOptions {
  method: "stripe" | "bank_transfer";
  actor: "system" | "admin";
  stripePaymentIntentId?: string;
  amount?: number;
}

export type SettleResult = { settled: true; type: string; bookingId: string } | { settled: false; reason: string };

/**
 * Records a payment against an invoice and moves the booking forward. The ONE
 * place money turns into booking state — used by the Stripe webhook AND the
 * admin's "mark paid" (bank transfer), so both behave identically.
 *
 *  - Idempotent: the paid-claim is a conditional UPDATE, so a retried webhook
 *    (or a double-click) can never confirm / message twice.
 *  - Deposit paid  → booking_confirmed → confirmation messages → auto-assign.
 *  - Balance paid  → paid → receipt + rating request.
 */
export async function settleInvoice(invoiceId: string, opts: SettleOptions): Promise<SettleResult> {
  const supabase: any = createAdminClient();
  const now = new Date().toISOString();

  const { data: claimed } = await supabase
    .from("invoices")
    .update({
      status: "paid",
      paid_at: now,
      ...(opts.stripePaymentIntentId ? { stripe_payment_intent_id: opts.stripePaymentIntentId } : {}),
    })
    .eq("id", invoiceId)
    .neq("status", "paid")
    .select("id, type, booking_id, customer_id, total, invoice_number");
  const invoice = claimed?.[0];
  if (!invoice) return { settled: false, reason: "Invoice not found or already paid" };

  const { data: booking } = await supabase
    .from("bookings")
    .select("status, reference, deposit_amount")
    .eq("id", invoice.booking_id)
    .single();
  const amountPaid = opts.amount ?? Number(invoice.total);
  const isDeposit = invoice.type === "deposit";

  let newStatus: string = booking?.status ?? "booking_confirmed";
  if (isDeposit && PRE_CONFIRMATION.includes(newStatus)) newStatus = "booking_confirmed";
  if (!isDeposit && newStatus !== "cancelled") newStatus = "paid";

  const patch: Record<string, unknown> = { status: newStatus };
  if (isDeposit) {
    patch.deposit_status = "verified";
    if (booking?.deposit_amount == null) patch.deposit_amount = Number(invoice.total);
  }
  await supabase.from("bookings").update(patch).eq("id", invoice.booking_id);

  await Promise.allSettled([
    newStatus !== booking?.status
      ? supabase.from("status_history").insert({
          booking_id: invoice.booking_id, previous_status: booking?.status ?? null, new_status: newStatus, changed_by: opts.actor,
          reason: `Payment received (${opts.method === "stripe" ? "card" : "bank transfer"})`,
        })
      : Promise.resolve(),
    supabase.from("activity_log").insert({
      booking_id: invoice.booking_id,
      action: `Payment received (${opts.method === "stripe" ? "card" : "bank transfer"}) for invoice ${invoice.invoice_number} — £${amountPaid.toFixed(2)}`,
      metadata: { invoiceId, method: opts.method, amount: amountPaid, stripePaymentIntentId: opts.stripePaymentIntentId ?? null },
      performed_by: opts.actor,
    }),
  ]);

  // Customer messaging + follow-on automation never fail the payment record.
  try {
    const { data: customer } = await supabase.from("customers").select("full_name, email, phone").eq("id", invoice.customer_id).single();
    const firstName = String(customer?.full_name ?? "there").split(" ")[0];
    if (customer && isDeposit) {
      await sendDepositConfirmedMessages({ reference: booking.reference, firstName, email: customer.email, phone: customer.phone });
    } else if (customer) {
      const { data: settings } = await supabase.from("settings").select("google_review_link").eq("id", 1).maybeSingle();
      const token = generateQuoteConfirmToken(invoice.booking_id) ?? "";
      await sendPaymentReceiptMessages({
        reference: booking.reference, firstName, email: customer.email, phone: customer.phone,
        amount: amountPaid, invoiceNumber: invoice.invoice_number,
        rateLink: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/rate/${invoice.booking_id}/${token}`,
        googleReviewLink: settings?.google_review_link ?? null,
      });
    }
    if (isDeposit && newStatus === "booking_confirmed") await autoAssignBooking(invoice.booking_id, "system");
  } catch (e) {
    await logError({ message: "post-payment automation failed", metadata: { invoiceId, error: String(e) } });
  }

  return { settled: true, type: invoice.type, bookingId: invoice.booking_id };
}
