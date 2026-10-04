/* eslint-disable @typescript-eslint/no-explicit-any -- untyped Supabase client */
import { createAdminClient } from "@/lib/supabase/server";
import { autoAssignBooking } from "@/lib/automation/autoAssign";
import { cancelFutureVisits } from "@/lib/automation/recurrence";
import { sendPushToCleaner } from "@/lib/push";
import { notifyCustomer, sendEmailSafe } from "@/lib/notify";
import { emailShell } from "@/lib/email-templates";
import { resendAdminEmail } from "@/lib/resend";
import { manageUrl } from "@/lib/bookings/links";
import { todayInLondon } from "@/lib/cleaner-auth";
import { isChangeable } from "@/lib/bookings/timing";
import { formatCurrency, formatDate } from "@/lib/utils";
import { SERVICE_LABELS, type ServiceType } from "@/types";

export type ChangeResult = { ok: true; reassigned?: boolean; refundDue?: number } | { ok: false; error: string; status: number };
type Actor = "customer" | "admin";


const SELECT = "id, reference, status, service_type, clean_date, clean_time, assigned_cleaner_id, parent_booking_id, frequency, customer_id, address:addresses(line_1, postcode), customer:customers(full_name, email, phone)";
const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));
const first = (name: string | undefined | null) => String(name ?? "there").split(" ")[0];

/** Tells the cleaner a job moved or was cancelled (push + email). */
async function tellCleaner(cleanerId: string, b: any, kind: "moved" | "cancelled", newWhen?: string): Promise<void> {
  const supabase: any = createAdminClient();
  const { data: cleaner } = await supabase.from("cleaners").select("full_name, email").eq("id", cleanerId).maybeSingle();
  const address = one<any>(b.address);
  const service = SERVICE_LABELS[b.service_type as ServiceType];
  const was = `${service}${b.clean_date ? ` on ${formatDate(b.clean_date)}` : ""}${address ? ` at ${address.line_1}, ${address.postcode}` : ""}`;
  await Promise.allSettled([
    sendPushToCleaner(cleanerId, {
      title: kind === "cancelled" ? "Job cancelled" : "Job moved",
      body: kind === "cancelled" ? `${was} has been cancelled.` : `${was} is no longer yours — it has moved to ${newWhen}.`,
      data: { bookingId: b.id },
    }),
    cleaner
      ? sendEmailSafe({
          to: cleaner.email,
          subject: kind === "cancelled" ? `Job cancelled: ${service}` : `Job moved: ${service}`,
          context: "cleaner: job changed",
          html: emailShell({
            heading: kind === "cancelled" ? "A job was cancelled" : "A job has moved",
            headerColor: "#b45309",
            reference: b.reference,
            bodyHtml: `<p>Hi ${first(cleaner.full_name)},</p><p>${kind === "cancelled" ? `<strong>${was}</strong> has been cancelled — you don't need to go.` : `<strong>${was}</strong> has been moved to ${newWhen}, so it's been taken off your schedule. If you're still free you may be offered it again.`}</p>`,
          }),
        })
      : Promise.resolve(),
  ]);
}

/**
 * Moves a booking to a new date/time. If a cleaner was assigned they're taken
 * off (and told), the booking returns to `booking_confirmed`, and the matcher
 * runs again for the new slot — preferring the same cleaner when they're free.
 */
export async function rescheduleBooking(
  bookingId: string,
  input: { cleanDate: string; cleanTime?: string | null },
  opts: { actor: Actor; notifyCustomer?: boolean },
): Promise<ChangeResult> {
  const supabase: any = createAdminClient();
  const { data: b } = await supabase.from("bookings").select(SELECT).eq("id", bookingId).maybeSingle();
  if (!b) return { ok: false, error: "Booking not found", status: 404 };
  if (!isChangeable(b.status)) return { ok: false, error: "This booking can no longer be changed.", status: 409 };

  const newTime = input.cleanTime === undefined ? b.clean_time : input.cleanTime;
  const hadCleaner: string | null = b.assigned_cleaner_id;
  const nextStatus = b.status === "cleaner_assigned" ? "booking_confirmed" : b.status;

  const { error } = await supabase
    .from("bookings")
    .update({
      clean_date: input.cleanDate, clean_time: newTime, is_flexible_date: false,
      assigned_cleaner_id: null, status: nextStatus, cleaner_reminder_sent_on: null,
    })
    .eq("id", bookingId);
  if (error) {
    if (error.code === "23505") return { ok: false, error: "That series already has a visit on that day.", status: 409 };
    return { ok: false, error: "Couldn't reschedule — please try again.", status: 500 };
  }

  const when = `${formatDate(input.cleanDate)}${newTime ? ` at ${String(newTime).slice(0, 5)}` : ""}`;
  await Promise.allSettled([
    nextStatus !== b.status
      ? supabase.from("status_history").insert({ booking_id: bookingId, previous_status: b.status, new_status: nextStatus, changed_by: opts.actor, reason: "Rescheduled" })
      : Promise.resolve(),
    supabase.from("activity_log").insert({
      booking_id: bookingId, action: `Rescheduled ${b.clean_date ? formatDate(b.clean_date) : "(flexible)"} → ${when}`,
      metadata: { from: b.clean_date, to: input.cleanDate }, performed_by: opts.actor,
    }),
  ]);

  if (hadCleaner) await tellCleaner(hadCleaner, b, "moved", when);
  let reassigned = false;
  if (nextStatus === "booking_confirmed") reassigned = (await autoAssignBooking(bookingId, "system")).assigned;

  const customer = one<any>(b.customer);
  const service = SERVICE_LABELS[b.service_type as ServiceType];
  const link = manageUrl(bookingId);
  if (customer && opts.notifyCustomer !== false) {
    await notifyCustomer({
      context: "customer: rescheduled",
      email: customer.email,
      phone: customer.phone,
      subject: `Your clean has been rescheduled (${b.reference})`,
      html: emailShell({
        heading: "Your clean has moved ✅",
        reference: b.reference,
        bodyHtml: `<p>Hi ${first(customer.full_name)},</p><p>Your ${service.toLowerCase()} is now booked for <strong>${when}</strong>.</p><p>We'll confirm your cleaner closer to the day.</p>`,
        cta: link ? { label: "Manage my booking", href: link } : undefined,
      }),
      sms: `Ample Cleaners: your ${service.toLowerCase()} is now booked for ${when}.${link ? ` Manage: ${link}` : ""} Ref ${b.reference}`,
      whatsapp: `Hi ${first(customer.full_name)}, your ${service.toLowerCase()} is now booked for *${when}* ✅${link ? `\n\nNeed to change it? ${link}` : ""}\n\nRef: ${b.reference}`,
    });
  }
  if (opts.actor === "customer") {
    await sendEmailSafe({
      to: resendAdminEmail,
      subject: `Customer rescheduled ${b.reference} → ${when}`,
      context: "admin: customer rescheduled",
      html: emailShell({ heading: "A customer moved their clean", reference: b.reference, bodyHtml: `<p><strong>${customer?.full_name ?? "A customer"}</strong> moved their ${service.toLowerCase()} to <strong>${when}</strong>. ${hadCleaner ? (reassigned ? "A cleaner has been re-matched automatically." : "<strong>No cleaner could be matched — it's flagged for you.</strong>") : ""}</p>`, cta: { label: "Open booking", href: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/admin/bookings/${bookingId}` } }),
    });
  }
  return { ok: true, reassigned };
}

/**
 * Cancels a booking (atomically, so a double click can't cancel twice). The
 * cleaner is told and released, unpaid invoices are voided, a recurring
 * series' future visits go too, and any money already paid FLAGS the booking
 * for a manual refund (refunds aren't automated until Stripe is connected).
 */
export async function cancelBooking(
  bookingId: string,
  opts: { actor: Actor; notifyCustomer?: boolean; reason?: string },
): Promise<ChangeResult> {
  const supabase: any = createAdminClient();
  const { data: before } = await supabase.from("bookings").select(SELECT).eq("id", bookingId).maybeSingle();
  if (!before) return { ok: false, error: "Booking not found", status: 404 };
  if (!isChangeable(before.status)) return { ok: false, error: "This booking can no longer be cancelled here.", status: 409 };

  const { data: claimed } = await supabase
    .from("bookings")
    .update({ status: "cancelled", assigned_cleaner_id: null })
    .eq("id", bookingId)
    .in("status", ["inquiry", "called", "not_called", "answered", "not_answered", "quote_sent", "deposit_invoice_sent", "booking_confirmed", "cleaner_assigned"])
    .select("id");
  if (!claimed?.length) return { ok: false, error: "This booking has already changed — please refresh.", status: 409 };

  const [{ data: paid }] = await Promise.all([
    supabase.from("invoices").select("total").eq("booking_id", bookingId).eq("status", "paid"),
    supabase.from("invoices").update({ status: "cancelled" }).eq("booking_id", bookingId).eq("status", "sent"),
  ]);
  const refundDue = (paid ?? []).reduce((s: number, i: any) => s + Number(i.total), 0);

  const isRoot = !before.parent_booking_id && before.frequency && before.frequency !== "one_off";
  const cancelledVisits = isRoot ? await cancelFutureVisits(bookingId, todayInLondon()) : 0;

  await Promise.allSettled([
    supabase.from("status_history").insert({ booking_id: bookingId, previous_status: before.status, new_status: "cancelled", changed_by: opts.actor, reason: opts.reason ?? "Cancelled" }),
    supabase.from("activity_log").insert({ booking_id: bookingId, action: `Cancelled by ${opts.actor}${opts.reason ? ` — ${opts.reason}` : ""}${cancelledVisits ? ` (${cancelledVisits} future visits cancelled)` : ""}`, performed_by: opts.actor }),
    refundDue > 0
      ? supabase.from("bookings").update({ is_flagged: true, flag_reason: `Cancelled with ${formatCurrency(refundDue)} already paid — refund to review` }).eq("id", bookingId)
      : Promise.resolve(),
  ]);

  if (before.assigned_cleaner_id) await tellCleaner(before.assigned_cleaner_id, before, "cancelled");

  const customer = one<any>(before.customer);
  const service = SERVICE_LABELS[before.service_type as ServiceType];
  if (customer && opts.notifyCustomer !== false) {
    await notifyCustomer({
      context: "customer: cancelled",
      email: customer.email,
      phone: customer.phone,
      subject: `Your booking is cancelled (${before.reference})`,
      html: emailShell({
        heading: "Your booking is cancelled",
        reference: before.reference,
        bodyHtml: `<p>Hi ${first(customer.full_name)},</p><p>We've cancelled your ${service.toLowerCase()}${before.clean_date ? ` on ${formatDate(before.clean_date)}` : ""}.${refundDue > 0 ? ` Your ${formatCurrency(refundDue)} payment will be refunded — we'll be in touch shortly.` : ""}</p><p>We'd love to look after you another time — you can book again whenever you like.</p>`,
      }),
      sms: `Ample Cleaners: your ${service.toLowerCase()}${before.clean_date ? ` on ${formatDate(before.clean_date)}` : ""} is cancelled.${refundDue > 0 ? " We'll be in touch about your refund." : ""} Ref ${before.reference}`,
      whatsapp: `Hi ${first(customer.full_name)}, your ${service.toLowerCase()}${before.clean_date ? ` on ${formatDate(before.clean_date)}` : ""} is cancelled.${refundDue > 0 ? ` We'll be in touch about your ${formatCurrency(refundDue)} refund.` : ""}\n\nRef: ${before.reference}`,
    });
  }
  if (opts.actor === "customer" || refundDue > 0) {
    await sendEmailSafe({
      to: resendAdminEmail,
      subject: `${refundDue > 0 ? "Refund to review — " : ""}${opts.actor === "customer" ? "customer cancelled" : "cancelled"} ${before.reference}`,
      context: "admin: cancellation",
      html: emailShell({
        heading: refundDue > 0 ? "Cancellation with a refund due" : "A booking was cancelled",
        headerColor: "#b45309",
        reference: before.reference,
        bodyHtml: `<p><strong>${customer?.full_name ?? "A customer"}</strong> cancelled their ${service.toLowerCase()}${before.clean_date ? ` on ${formatDate(before.clean_date)}` : ""}.${refundDue > 0 ? ` <strong>${formatCurrency(refundDue)} has been paid and needs refunding manually.</strong>` : ""}${opts.reason ? ` Reason: “${String(opts.reason).replace(/</g, "&lt;")}”` : ""}</p>`,
        cta: { label: "Open booking", href: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/admin/bookings/${bookingId}` },
      }),
    });
  }
  return { ok: true, refundDue };
}

/**
 * Ends a recurring series: the root stops generating (frequency → one_off) and
 * its not-yet-started future visits are cancelled. Works whatever state the
 * root visit is in (usually long since done), which `cancelBooking` can't.
 * Idempotent.
 */
export async function stopSeries(rootId: string, opts: { actor: Actor; reason?: string; notifyCustomer?: boolean }): Promise<ChangeResult> {
  const supabase: any = createAdminClient();
  const { data: root } = await supabase.from("bookings").select(SELECT).eq("id", rootId).maybeSingle();
  if (!root) return { ok: false, error: "Booking not found", status: 404 };
  if (root.parent_booking_id) return { ok: false, error: "Not a series root", status: 400 };

  const wasRecurring = !!root.frequency && root.frequency !== "one_off";
  await supabase.from("bookings").update({ frequency: "one_off", next_occurrence_date: null }).eq("id", rootId);
  // A customer can't cancel anything inside the 48h window online, so a customer-initiated stop leaves
  // visits dated today or tomorrow in place (cancelFutureVisits cancels dates strictly AFTER the cutoff).
  const today = todayInLondon();
  const cutoff = opts.actor === "customer" ? new Date(Date.parse(`${today}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10) : today;
  const cancelled = await cancelFutureVisits(rootId, cutoff);

  if (wasRecurring) {
    await Promise.allSettled([
      supabase.from("activity_log").insert({ booking_id: rootId, action: `Recurring series stopped by ${opts.actor}${opts.reason ? ` — ${opts.reason}` : ""} (${cancelled} future visit${cancelled === 1 ? "" : "s"} cancelled)`, performed_by: opts.actor }),
      (async () => {
        const customer = one<any>(root.customer);
        if (customer && opts.notifyCustomer !== false) {
          const service = SERVICE_LABELS[root.service_type as ServiceType];
          await notifyCustomer({
            context: "customer: series stopped",
            email: customer.email,
            phone: customer.phone,
            subject: `Your regular cleans have been stopped (${root.reference})`,
            html: emailShell({ heading: "Your regular cleans are stopped", reference: root.reference, bodyHtml: `<p>Hi ${first(customer.full_name)},</p><p>We've stopped your regular ${service.toLowerCase()} and cancelled any upcoming visits. You won't be charged for anything further.</p><p>We'd love to look after you again — just book whenever you're ready.</p>` }),
            sms: `Ample Cleaners: your regular ${service.toLowerCase()} is stopped and upcoming visits are cancelled. Ref ${root.reference}`,
            whatsapp: `Hi ${first(customer.full_name)}, your regular ${service.toLowerCase()} is stopped and upcoming visits are cancelled.\n\nRef: ${root.reference}`,
          });
        }
        if (opts.actor === "customer") {
          await sendEmailSafe({
            to: resendAdminEmail,
            subject: `Customer stopped their regular clean — ${root.reference}`,
            context: "admin: series stopped",
            html: emailShell({ heading: "A recurring customer stopped", headerColor: "#b45309", reference: root.reference, bodyHtml: `<p><strong>${customer?.full_name ?? "A customer"}</strong> ended their ${root.frequency} ${String(SERVICE_LABELS[root.service_type as ServiceType]).toLowerCase()}. ${cancelled} upcoming visit(s) cancelled.${opts.reason ? ` Reason: “${String(opts.reason).replace(/</g, "&lt;")}”` : ""}</p>` }),
          });
        }
      })(),
    ]);
  }
  return { ok: true };
}
