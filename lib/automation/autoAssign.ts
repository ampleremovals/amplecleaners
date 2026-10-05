/* eslint-disable @typescript-eslint/no-explicit-any -- untyped Supabase client; rows are narrowed at the boundary */
import { addDays } from "date-fns";
import { createAdminClient } from "@/lib/supabase/server";
import { sendPushToCleaner } from "@/lib/push";
import { notifyCustomer, sendEmailSafe } from "@/lib/notify";
import { emailShell, BRAND } from "@/lib/email-templates";
import { resendAdminEmail } from "@/lib/resend";
import { formatDate } from "@/lib/utils";
import { manageUrl } from "@/lib/bookings/links";
import {
  estimateJobHours, explainNoMatch, rankCleaners, toMinutes,
  type BusySlot, type MatchCleaner,
} from "@/lib/automation/matching";
import { SERVICE_LABELS, type ServiceType } from "@/types";

const DEAD_STATUSES = ["cancelled", "bad_lead", "not_a_good_fit"];
const LOAD_WINDOW_DAYS = 7;

export type AutoAssignResult =
  | { assigned: true; cleanerId: string; cleanerName: string }
  | { assigned: false; reason: string };

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Picks the best eligible cleaner for a confirmed, unassigned booking and
 * assigns them. Safe to call repeatedly / concurrently: the claim is a
 * conditional UPDATE (only if still unassigned + booking_confirmed), so two
 * racing triggers can never double-assign.
 *
 * No eligible cleaner → the booking is FLAGGED with a specific reason and the
 * admin is emailed, instead of silently sitting unassigned.
 */
export async function autoAssignBooking(bookingId: string, actor: "system" | "admin" = "system"): Promise<AutoAssignResult> {
  const supabase: any = createAdminClient();

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, reference, status, service_type, clean_date, clean_time, quote_line_items, assigned_cleaner_id, parent_booking_id, is_flagged, flag_reason, address:addresses(postcode)")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking) return { assigned: false, reason: "Booking not found" };
  if (booking.assigned_cleaner_id) return { assigned: false, reason: "Already has a cleaner" };
  if (booking.status !== "booking_confirmed") return { assigned: false, reason: "Booking isn't confirmed yet" };
  if (!booking.clean_date) return { assigned: false, reason: "No clean date set (flexible) — set a date first" };

  const address = Array.isArray(booking.address) ? booking.address[0] : booking.address;
  const postcode: string = address?.postcode ?? "";
  if (!postcode) return { assigned: false, reason: "No postcode on the booking" };

  const cleaners = await loadMatchCleaners(supabase);
  const date: string = booking.clean_date;

  const around = {
    from: isoDate(addDays(new Date(`${date}T00:00:00Z`), -LOAD_WINDOW_DAYS)),
    to: isoDate(addDays(new Date(`${date}T00:00:00Z`), LOAD_WINDOW_DAYS)),
  };
  const { data: nearby } = await supabase
    .from("bookings")
    .select("id, assigned_cleaner_id, clean_date, clean_time, service_type, quote_line_items")
    .not("assigned_cleaner_id", "is", null)
    .not("status", "in", `(${DEAD_STATUSES.join(",")})`)
    .gte("clean_date", around.from)
    .lte("clean_date", around.to)
    .neq("id", booking.id);

  const busy: BusySlot[] = [];
  const load = new Map<string, number>();
  for (const b of nearby ?? []) {
    load.set(b.assigned_cleaner_id, (load.get(b.assigned_cleaner_id) ?? 0) + 1);
    if (b.clean_date === date) {
      const start = toMinutes(b.clean_time) ?? 9 * 60;
      busy.push({ cleanerId: b.assigned_cleaner_id, date, startMin: start, endMin: start + estimateJobHours(b.service_type, b.quote_line_items) * 60 });
    }
  }

  // Series continuity: a recurring client keeps the cleaner they already have.
  const rootId: string = booking.parent_booking_id ?? booking.id;
  const { data: sibling } = await supabase
    .from("bookings")
    .select("assigned_cleaner_id")
    .or(`id.eq.${rootId},parent_booking_id.eq.${rootId}`)
    .not("assigned_cleaner_id", "is", null)
    .neq("id", booking.id)
    .order("clean_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const job = {
    cleanDate: date,
    startMin: toMinutes(booking.clean_time),
    hours: estimateJobHours(booking.service_type, booking.quote_line_items),
    postcode,
    preferredCleanerId: sibling?.assigned_cleaner_id ?? null,
    declinedBy: ((await supabase.from("booking_declines").select("cleaner_id").eq("booking_id", booking.id)).data ?? []).map((d: any) => d.cleaner_id as string),
  };

  const ranked = rankCleaners(job, cleaners, busy, load);
  if (!ranked.length) {
    const why = explainNoMatch(job, cleaners, busy);
    await flagUnmatched(supabase, booking, why);
    return { assigned: false, reason: `No eligible cleaner — ${why}` };
  }

  const best = ranked[0];
  const { data: claimed } = await supabase
    .from("bookings")
    .update({ assigned_cleaner_id: best.cleaner.id, status: "cleaner_assigned", is_flagged: false, flag_reason: null })
    .eq("id", booking.id)
    .is("assigned_cleaner_id", null)
    .eq("status", "booking_confirmed")
    .select("id");
  if (!claimed?.length) return { assigned: false, reason: "Another process assigned this booking first" };

  const why = best.isPreferred ? "their regular cleaner for this client" : `lightest workload (${best.load} job${best.load === 1 ? "" : "s"} nearby)`;
  await Promise.allSettled([
    supabase.from("status_history").insert({
      booking_id: booking.id, previous_status: "booking_confirmed", new_status: "cleaner_assigned", changed_by: actor,
      reason: `Auto-assigned to ${best.cleaner.fullName}`,
    }),
    supabase.from("activity_log").insert({
      booking_id: booking.id, action: `Auto-assigned to ${best.cleaner.fullName} — ${why}`,
      metadata: { cleanerId: best.cleaner.id, candidates: ranked.length }, performed_by: actor,
    }),
  ]);

  await notifyJobAssigned(booking.id, best.cleaner.id);
  return { assigned: true, cleanerId: best.cleaner.id, cleanerName: best.cleaner.fullName };
}

async function loadMatchCleaners(supabase: any): Promise<MatchCleaner[]> {
  const { data } = await supabase
    .from("cleaners")
    .select("id, full_name, dbs_verified, rating_avg, cleaner_coverage_areas(postcode_prefix), cleaner_availability(day_of_week, start_time, end_time), cleaner_time_off(start_date, end_date)")
    .eq("is_active", true);
  return (data ?? []).map((c: any): MatchCleaner => ({
    id: c.id,
    fullName: c.full_name,
    dbsVerified: !!c.dbs_verified,
    ratingAvg: c.rating_avg == null ? null : Number(c.rating_avg),
    coveragePrefixes: (c.cleaner_coverage_areas ?? []).map((a: any) => a.postcode_prefix),
    timeOff: (c.cleaner_time_off ?? []).map((t: any) => ({ start: t.start_date, end: t.end_date })),
    availability: (c.cleaner_availability ?? []).flatMap((a: any) => {
      const startMin = toMinutes(a.start_time);
      const endMin = toMinutes(a.end_time);
      return startMin == null || endMin == null ? [] : [{ dayOfWeek: a.day_of_week, startMin, endMin }];
    }),
  }));
}

async function flagUnmatched(supabase: any, booking: any, why: string): Promise<void> {
  const reason = `Auto-assign found no cleaner: ${why}`;
  if (booking.is_flagged && booking.flag_reason === reason) return; // don't re-email the same problem daily
  await Promise.allSettled([
    supabase.from("bookings").update({ is_flagged: true, flag_reason: reason }).eq("id", booking.id),
    supabase.from("activity_log").insert({ booking_id: booking.id, action: reason, performed_by: "system" }),
    sendEmailSafe({
      to: resendAdminEmail,
      subject: `Needs a cleaner — ${booking.reference} (${formatDate(booking.clean_date)})`,
      context: "admin: no cleaner matched",
      html: emailShell({
        heading: "A booking needs a cleaner",
        headerColor: "#b45309",
        reference: booking.reference,
        bodyHtml: `<p>${SERVICE_LABELS[booking.service_type as ServiceType]} on <strong>${formatDate(booking.clean_date)}</strong> is confirmed but I couldn't auto-assign anyone.</p><p style="background:#fffbeb;border-left:4px solid #b45309;padding:12px;">${why}</p><p>Open the booking in the admin and assign someone manually, or add availability/coverage to a cleaner.</p>`,
        cta: { label: "Open admin", href: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/admin/bookings/${booking.id}` },
      }),
    }),
  ]);
}

/**
 * Tells the cleaner (push + email) and the customer (email + SMS + WhatsApp)
 * about a new assignment. Shared by auto-assign and the admin's manual assign.
 */
export async function notifyJobAssigned(bookingId: string, cleanerId: string): Promise<void> {
  const supabase: any = createAdminClient();
  const [{ data: booking }, { data: cleaner }] = await Promise.all([
    supabase.from("bookings")
      .select("reference, service_type, clean_date, clean_time, address:addresses(line_1, postcode), customer:customers(full_name, email, phone)")
      .eq("id", bookingId).maybeSingle(),
    supabase.from("cleaners").select("full_name, email").eq("id", cleanerId).maybeSingle(),
  ]);
  if (!booking || !cleaner) return;

  const address = Array.isArray(booking.address) ? booking.address[0] : booking.address;
  const customer = Array.isArray(booking.customer) ? booking.customer[0] : booking.customer;
  const when = booking.clean_date ? formatDate(booking.clean_date) : "date to be confirmed";
  const time = booking.clean_time ? ` at ${String(booking.clean_time).slice(0, 5)}` : "";
  const service = SERVICE_LABELS[booking.service_type as ServiceType];
  const manage = manageUrl(bookingId);
  const where = address ? `${address.line_1}, ${address.postcode}` : "address on the job";

  await Promise.allSettled([
    sendPushToCleaner(cleanerId, {
      title: "New job assigned",
      body: `${service} — ${when}${time}, ${where}`,
      data: { bookingId },
    }),
    sendEmailSafe({
      to: cleaner.email,
      subject: `New job: ${service} on ${when}`,
      context: "cleaner: job assigned",
      html: emailShell({
        heading: "You've got a new job",
        reference: booking.reference,
        bodyHtml: `<p>Hi ${cleaner.full_name.split(" ")[0]},</p><p><strong>${service}</strong><br>${when}${time}<br>${where}</p><p>Open the Ample Cleaner app for the full details and checklist.</p>`,
      }),
    }),
    customer
      ? notifyCustomer({
          context: "customer: cleaner assigned",
          email: customer.email,
          phone: customer.phone,
          subject: `Your cleaner is confirmed (${booking.reference})`,
          html: emailShell({
            heading: "Your cleaner is confirmed ✅",
            reference: booking.reference,
            bodyHtml: `<p>Hi ${String(customer.full_name).split(" ")[0]},</p><p>Good news — <strong style="color:${BRAND.green}">${cleaner.full_name.split(" ")[0]}</strong> will be looking after your ${service.toLowerCase()} on <strong>${when}${time}</strong>.</p><p>Nothing more for you to do — we'll see you then.</p>`,
            cta: manage ? { label: "Manage my booking", href: manage } : undefined,
          }),
          sms: `Ample Cleaners: ${cleaner.full_name.split(" ")[0]} will be doing your ${service.toLowerCase()} on ${when}${time}. Ref ${booking.reference}${manage ? ` Change or cancel: ${manage}` : ""}`,
          whatsapp: `Hi ${String(customer.full_name).split(" ")[0]}, ${cleaner.full_name.split(" ")[0]} will be looking after your ${service.toLowerCase()} on ${when}${time} ✅\n\nRef: ${booking.reference}`,
        })
      : Promise.resolve(),
  ]);
}
