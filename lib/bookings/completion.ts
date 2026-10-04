/* eslint-disable @typescript-eslint/no-explicit-any -- untyped Supabase client */
import { createAdminClient } from "@/lib/supabase/server";
import { getOrCreateBookingInvoice } from "@/lib/bookings/booking-invoice";
import { sendBalanceInvoiceMessages } from "@/lib/bookings/invoiceDelivery";
import { logError } from "@/lib/log-error";
import { formatDate } from "@/lib/utils";
import { SERVICE_LABELS, type ServiceType } from "@/types";

const round2 = (n: number) => Math.round(n * 100) / 100;

export type CompletionResult =
  | { done: true; invoiceId: string; amount: number }
  | { done: true; alreadySettled: true }
  | { done: false; reason: string };

/**
 * Runs when a job reaches `job_completed` (cleaner clock-out, or an admin
 * moving the card): bills the customer and tells them, automatically.
 *
 *  - First visit / one-off → balance = quote total − anything already paid
 *    (the deposit), invoice type `full_balance`.
 *  - Recurring visit (has a parent) → the full visit price, type `recurring`.
 *    DECISION: recurring clients are billed PER VISIT after each clean — no
 *    subscription/stored card — which needs no new Stripe object model and
 *    keeps a missed/cancelled visit from ever being charged.
 *  - Nothing left to pay (deposit covered it) → straight to `paid`.
 *
 * Idempotent: guarded by `completion_processed_at` (conditional claim), and
 * released again on failure so the daily safety-net sweep retries it.
 */
export async function processJobCompletion(bookingId: string): Promise<CompletionResult> {
  const supabase: any = createAdminClient();

  const { data: claimed } = await supabase
    .from("bookings")
    .update({ completion_processed_at: new Date().toISOString() })
    .eq("id", bookingId)
    .is("completion_processed_at", null)
    .eq("status", "job_completed")
    .select("id, reference, service_type, clean_date, quote_total, parent_booking_id, customer_id");
  const booking = claimed?.[0];
  if (!booking) return { done: false, reason: "Not in job_completed, or already processed" };

  const release = () => supabase.from("bookings").update({ completion_processed_at: null }).eq("id", bookingId);

  try {
    const total = Number(booking.quote_total) || 0;
    if (total <= 0) {
      await Promise.allSettled([
        supabase.from("bookings").update({ is_flagged: true, flag_reason: "Job completed but there's no quote total — create the invoice manually" }).eq("id", bookingId),
        supabase.from("activity_log").insert({ booking_id: bookingId, action: "Completion: no quote total, so no invoice was created", performed_by: "system" }),
      ]);
      return { done: false, reason: "No quote total" };
    }

    const { data: paidInvoices } = await supabase.from("invoices").select("total").eq("booking_id", bookingId).eq("status", "paid");
    const paidSoFar = (paidInvoices ?? []).reduce((s: number, i: any) => s + Number(i.total), 0);
    const net = round2(total - paidSoFar);

    if (net <= 0) {
      await supabase.from("bookings").update({ status: "paid" }).eq("id", bookingId);
      await Promise.allSettled([
        supabase.from("status_history").insert({ booking_id: bookingId, previous_status: "job_completed", new_status: "paid", changed_by: "system", reason: "Fully covered by payments already received" }),
        supabase.from("activity_log").insert({ booking_id: bookingId, action: "Job completed — nothing left to pay", performed_by: "system" }),
      ]);
      return { done: true, alreadySettled: true };
    }

    const isRecurring = !!booking.parent_booking_id;
    const label = SERVICE_LABELS[booking.service_type as ServiceType];
    const invoice = await getOrCreateBookingInvoice(supabase, {
      bookingId,
      customerId: booking.customer_id,
      type: isRecurring ? "recurring" : "full_balance",
      net,
      description: `${label}${booking.clean_date ? ` — ${formatDate(booking.clean_date)}` : ""} (${booking.reference})`,
    });

    await supabase.from("invoices").update({ sent_at: new Date().toISOString() }).eq("id", invoice.invoiceId);
    await supabase.from("bookings").update({ status: "invoice_sent" }).eq("id", bookingId);
    await Promise.allSettled([
      supabase.from("status_history").insert({ booking_id: bookingId, previous_status: "job_completed", new_status: "invoice_sent", changed_by: "system" }),
      supabase.from("activity_log").insert({ booking_id: bookingId, action: `Invoice sent automatically — £${net.toFixed(2)}`, metadata: { invoiceId: invoice.invoiceId }, performed_by: "system" }),
    ]);

    const [{ data: customer }, { data: inv }] = await Promise.all([
      supabase.from("customers").select("full_name, email, phone").eq("id", booking.customer_id).single(),
      supabase.from("invoices").select("invoice_number, due_date").eq("id", invoice.invoiceId).single(),
    ]);
    if (customer && inv) {
      await sendBalanceInvoiceMessages({
        invoiceId: invoice.invoiceId, invoiceNumber: inv.invoice_number, reference: booking.reference,
        firstName: String(customer.full_name).split(" ")[0], email: customer.email, phone: customer.phone,
        total: invoice.total, dueDate: inv.due_date, kind: isRecurring ? "recurring" : "full_balance",
      });
    }
    return { done: true, invoiceId: invoice.invoiceId, amount: invoice.total };
  } catch (e) {
    await release();
    await logError({ message: "job completion processing failed", metadata: { bookingId, error: String(e) } });
    return { done: false, reason: e instanceof Error ? e.message : "failed" };
  }
}
