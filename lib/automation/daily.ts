/* eslint-disable @typescript-eslint/no-explicit-any -- untyped Supabase client */
import { addDays } from "date-fns";
import { createAdminClient } from "@/lib/supabase/server";
import { autoAssignBooking } from "@/lib/automation/autoAssign";
import { generateRecurringVisits, LOOKAHEAD_DAYS } from "@/lib/automation/recurrence";
import { processJobCompletion } from "@/lib/bookings/completion";
import { sendInvoiceReminderMessages } from "@/lib/bookings/invoiceDelivery";
import { sendPushToCleaner } from "@/lib/push";
import { notifyCustomer, sendEmailSafe } from "@/lib/notify";
import { emailShell } from "@/lib/email-templates";
import { resendAdminEmail } from "@/lib/resend";
import { todayInLondon } from "@/lib/cleaner-auth";
import { formatDate } from "@/lib/utils";
import { logError } from "@/lib/log-error";
import { SERVICE_LABELS, type ServiceType } from "@/types";

const MAX_INVOICE_REMINDERS = 3;
const REMINDER_GAP_DAYS = 3;

const iso = (d: Date) => d.toISOString().slice(0, 10);
const plusDays = (isoDate: string, n: number) => iso(addDays(new Date(`${isoDate}T00:00:00Z`), n));

/** Runs a step; one failing step never stops the rest of the daily run. */
async function step<T>(name: string, fn: () => Promise<T>): Promise<T | { error: string }> {
  try {
    return await fn();
  } catch (e) {
    await logError({ message: `daily automation step failed: ${name}`, metadata: { error: String(e) } });
    return { error: String(e) };
  }
}

/** Morning run: recurring visits, matching, completion safety-net, invoice chasing, housekeeping. */
export async function runMorningAutomation(now: Date = new Date()) {
  const today = todayInLondon(now);
  return {
    recurring: await step("recurring", () => generateRecurringVisits(today)),
    assigned: await step("assign", () => assignPendingBookings(today)),
    completions: await step("completions", () => sweepUnprocessedCompletions()),
    invoiceReminders: await step("invoice reminders", () => sendOverdueInvoiceReminders(today)),
    housekeeping: await step("housekeeping", () => housekeeping()),
  };
}

/** Evening run: tomorrow's reminders to cleaners and customers. */
export async function runEveningAutomation(now: Date = new Date()) {
  const today = todayInLondon(now);
  return { reminders: await step("day-before reminders", () => sendDayBeforeReminders(today)) };
}

/** Confirmed jobs inside the lookahead window that still have no cleaner. */
async function assignPendingBookings(today: string): Promise<{ tried: number; assigned: number }> {
  const supabase: any = createAdminClient();
  const { data } = await supabase
    .from("bookings")
    .select("id")
    .eq("status", "booking_confirmed")
    .is("assigned_cleaner_id", null)
    .gte("clean_date", today)
    .lte("clean_date", plusDays(today, LOOKAHEAD_DAYS));
  let assigned = 0;
  for (const b of data ?? []) {
    const r = await autoAssignBooking(b.id, "system");
    if (r.assigned) assigned++;
  }
  return { tried: data?.length ?? 0, assigned };
}

/** Catches jobs that reached job_completed but whose invoicing failed or was skipped. */
async function sweepUnprocessedCompletions(): Promise<{ processed: number }> {
  const supabase: any = createAdminClient();
  const { data } = await supabase.from("bookings").select("id").eq("status", "job_completed").is("completion_processed_at", null);
  let processed = 0;
  for (const b of data ?? []) {
    const r = await processJobCompletion(b.id);
    if (r.done) processed++;
  }
  return { processed };
}

async function sendOverdueInvoiceReminders(today: string): Promise<{ sent: number; escalated: number }> {
  const supabase: any = createAdminClient();
  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, invoice_number, total, due_date, reminder_count, last_reminder_sent_on, type, booking_id, customer:customers(full_name, email, phone), booking:bookings(reference)")
    .eq("status", "sent")
    .in("type", ["full_balance", "recurring"])
    .lt("due_date", today)
    .lt("reminder_count", MAX_INVOICE_REMINDERS);

  let sent = 0;
  let escalated = 0;
  for (const inv of invoices ?? []) {
    if (inv.last_reminder_sent_on && inv.last_reminder_sent_on > plusDays(today, -REMINDER_GAP_DAYS)) continue;
    const customer = Array.isArray(inv.customer) ? inv.customer[0] : inv.customer;
    const booking = Array.isArray(inv.booking) ? inv.booking[0] : inv.booking;
    if (!customer || !booking) continue;

    const n = (inv.reminder_count ?? 0) + 1;
    await sendInvoiceReminderMessages({
      n, invoiceId: inv.id, invoiceNumber: inv.invoice_number, reference: booking.reference,
      firstName: String(customer.full_name).split(" ")[0], email: customer.email, phone: customer.phone,
      total: Number(inv.total), dueDate: inv.due_date, kind: inv.type,
    });
    await supabase.from("invoices").update({ reminder_count: n, last_reminder_sent_on: today }).eq("id", inv.id);
    await supabase.from("activity_log").insert({ booking_id: inv.booking_id, action: `Overdue reminder ${n}/${MAX_INVOICE_REMINDERS} sent for ${inv.invoice_number}`, performed_by: "system" });
    sent++;

    if (n >= MAX_INVOICE_REMINDERS) {
      escalated++;
      await Promise.allSettled([
        supabase.from("bookings").update({ is_flagged: true, flag_reason: `Invoice ${inv.invoice_number} still unpaid after ${MAX_INVOICE_REMINDERS} reminders` }).eq("id", inv.booking_id),
        sendEmailSafe({
          to: resendAdminEmail,
          subject: `Unpaid after ${MAX_INVOICE_REMINDERS} reminders — ${booking.reference}`,
          context: "admin: invoice escalation",
          html: emailShell({ heading: "Invoice needs a personal chase", headerColor: "#b45309", reference: booking.reference, bodyHtml: `<p><strong>${customer.full_name}</strong> hasn't paid invoice ${inv.invoice_number} (£${Number(inv.total).toFixed(2)}, due ${formatDate(inv.due_date)}) after ${MAX_INVOICE_REMINDERS} automatic reminders. Time for a phone call.</p>` }),
        }),
      ]);
    }
  }
  return { sent, escalated };
}

/** The reminder for tomorrow's jobs — cleaner push + customer message, once per job. */
async function sendDayBeforeReminders(today: string): Promise<{ jobs: number }> {
  const supabase: any = createAdminClient();
  const tomorrow = plusDays(today, 1);
  const { data: jobs } = await supabase
    .from("bookings")
    .select("id, reference, service_type, clean_time, assigned_cleaner_id, cleaner_reminder_sent_on, address:addresses(line_1, postcode), customer:customers(full_name, email, phone), cleaner:cleaners(full_name)")
    .eq("clean_date", tomorrow)
    .in("status", ["cleaner_assigned", "booking_confirmed"])
    .not("assigned_cleaner_id", "is", null);

  let count = 0;
  for (const job of jobs ?? []) {
    if (job.cleaner_reminder_sent_on === today) continue;
    const address = Array.isArray(job.address) ? job.address[0] : job.address;
    const customer = Array.isArray(job.customer) ? job.customer[0] : job.customer;
    const cleaner = Array.isArray(job.cleaner) ? job.cleaner[0] : job.cleaner;
    const service = SERVICE_LABELS[job.service_type as ServiceType];
    const time = job.clean_time ? ` at ${String(job.clean_time).slice(0, 5)}` : "";

    await Promise.allSettled([
      sendPushToCleaner(job.assigned_cleaner_id, {
        title: "Job tomorrow",
        body: `${service}${time}${address ? ` — ${address.line_1}, ${address.postcode}` : ""}`,
        data: { bookingId: job.id },
      }),
      customer
        ? notifyCustomer({
            context: "customer: day-before reminder",
            email: customer.email,
            phone: customer.phone,
            subject: `Your clean is tomorrow${time} (${job.reference})`,
            html: emailShell({
              heading: "See you tomorrow ✨",
              reference: job.reference,
              bodyHtml: `<p>Hi ${String(customer.full_name).split(" ")[0]},</p><p>A quick reminder that ${cleaner ? `<strong>${String(cleaner.full_name).split(" ")[0]}</strong> is` : "we're"} coming to do your ${service.toLowerCase()} tomorrow${time}.</p><p>Please make sure we can get in, and let us know about parking or access if it's tricky.</p>`,
            }),
            sms: `Ample Cleaners: reminder — your ${service.toLowerCase()} is tomorrow${time}. Please make sure we can get in. Ref ${job.reference}`,
            whatsapp: `Hi ${String(customer.full_name).split(" ")[0]}, a reminder that your ${service.toLowerCase()} is tomorrow${time} ✨ Please make sure we can get in.\n\nRef: ${job.reference}`,
          })
        : Promise.resolve(),
      supabase.from("bookings").update({ cleaner_reminder_sent_on: today }).eq("id", job.id),
    ]);
    count++;
  }
  return { jobs: count };
}

async function housekeeping(): Promise<{ rateLimitRowsDeleted: number }> {
  const supabase: any = createAdminClient();
  const cutoff = new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString();
  const { data } = await supabase.from("rate_limits").delete().lt("window_start", cutoff).select("key");
  return { rateLimitRowsDeleted: data?.length ?? 0 };
}
