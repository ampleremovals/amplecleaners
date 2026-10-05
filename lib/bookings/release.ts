/* eslint-disable @typescript-eslint/no-explicit-any -- untyped Supabase client */
import { createAdminClient } from "@/lib/supabase/server";
import { autoAssignBooking } from "@/lib/automation/autoAssign";
import { sendEmailSafe } from "@/lib/notify";
import { emailShell } from "@/lib/email-templates";
import { resendAdminEmail } from "@/lib/resend";
import { hoursUntilJob } from "@/lib/bookings/timing";
import { formatDate } from "@/lib/utils";
import { SERVICE_LABELS, type ServiceType } from "@/types";

export type ReleaseResult = { ok: true; reassigned: boolean } | { ok: false; error: string; status: number };

/**
 * A cleaner gives a job back (declines it, or it falls inside their new time
 * off). The job returns to `booking_confirmed`, the matcher immediately looks
 * for someone else — never the same cleaner again if they declined — and the
 * admin is told (urgently if the job is within 24 hours or nobody was found).
 * Only a not-yet-started job assigned to THIS cleaner can be released; the
 * release is a conditional update, so a double tap can't release twice.
 */
export async function releaseJob(
  bookingId: string,
  cleanerId: string,
  opts: { reason: string; kind: "declined" | "time_off" },
): Promise<ReleaseResult> {
  const supabase: any = createAdminClient();
  const { data: claimed } = await supabase
    .from("bookings")
    .update({ assigned_cleaner_id: null, status: "booking_confirmed", cleaner_reminder_sent_on: null })
    .eq("id", bookingId)
    .eq("assigned_cleaner_id", cleanerId)
    .eq("status", "cleaner_assigned")
    .is("clock_in_at", null)
    .select("id, reference, service_type, clean_date, clean_time");
  const b = claimed?.[0];
  if (!b) return { ok: false, error: "This job can't be given back any more (it may have started).", status: 409 };

  const { data: cleaner } = await supabase.from("cleaners").select("full_name").eq("id", cleanerId).maybeSingle();
  const name = cleaner?.full_name ?? "A cleaner";

  if (opts.kind === "declined") {
    await supabase.from("booking_declines").upsert({ booking_id: bookingId, cleaner_id: cleanerId, reason: opts.reason }, { onConflict: "booking_id,cleaner_id" });
  }
  await Promise.allSettled([
    supabase.from("status_history").insert({ booking_id: bookingId, previous_status: "cleaner_assigned", new_status: "booking_confirmed", changed_by: "cleaner", reason: `${name} ${opts.kind === "declined" ? "declined" : "is on time off"} — ${opts.reason}` }),
    supabase.from("activity_log").insert({ booking_id: bookingId, action: `${name} ${opts.kind === "declined" ? "declined the job" : "released the job (time off)"} — ${opts.reason}`, performed_by: "cleaner" }),
  ]);

  const result = await autoAssignBooking(bookingId, "system");
  const reassigned = result.assigned;

  const urgent = !!b.clean_date && hoursUntilJob(b.clean_date, b.clean_time) < 24;
  const service = SERVICE_LABELS[b.service_type as ServiceType];
  await sendEmailSafe({
    to: resendAdminEmail,
    subject: `${urgent || !reassigned ? "⚠️ " : ""}${name} ${opts.kind === "declined" ? "declined" : "released"} ${b.reference}${b.clean_date ? ` (${formatDate(b.clean_date)})` : ""}`,
    context: "admin: cleaner released job",
    html: emailShell({
      heading: reassigned ? "A cleaner gave a job back" : "A job needs a new cleaner",
      headerColor: reassigned ? undefined : "#b45309",
      reference: b.reference,
      bodyHtml: `<p><strong>${name}</strong> ${opts.kind === "declined" ? "declined" : "had to release"} the ${service.toLowerCase()}${b.clean_date ? ` on <strong>${formatDate(b.clean_date)}</strong>` : ""}. Reason: “${String(opts.reason).replace(/</g, "&lt;")}”.</p><p>${reassigned ? "A replacement was matched automatically and the customer was told." : "<strong>No replacement could be matched automatically — the booking is flagged for you.</strong>"}${urgent ? " <strong>It's within 24 hours.</strong>" : ""}</p>`,
      cta: { label: "Open booking", href: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/admin/bookings/${bookingId}` },
    }),
  });
  return { ok: true, reassigned };
}
