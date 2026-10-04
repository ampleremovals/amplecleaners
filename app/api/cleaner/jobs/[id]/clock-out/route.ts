import { NextRequest, NextResponse } from "next/server";
import { requireCleaner } from "@/lib/cleaner-auth";
import { getOwnedJob, locationSchema } from "@/lib/cleaner-jobs";
import { createAdminClient } from "@/lib/supabase/server";
import { processJobCompletion } from "@/lib/bookings/completion";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * POST /api/cleaner/jobs/[id]/clock-out — finish the job. Completing a job
 * automatically bills the customer (invoice + email/SMS/WhatsApp), so the
 * cleaner's tap is the last manual step in the whole pipeline.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireCleaner();
  if (!auth.ok) return auth.response;
  const owned = await getOwnedJob(auth.session.cleanerId, params.id);
  if (!owned.ok) return owned.response;
  const { job } = owned;

  if (job.clock_out_at) return NextResponse.json({ success: true, alreadyClockedOut: true });
  if (!job.clock_in_at || job.status !== "in_progress") {
    return NextResponse.json({ success: false, error: "Clock in before you clock out." }, { status: 409 });
  }

  const loc = locationSchema.safeParse(await req.json().catch(() => ({})));
  const { lat, lng } = loc.success ? loc.data : { lat: undefined, lng: undefined };

  const supabase = createAdminClient();
  const { data: updated } = await supabase
    .from("bookings")
    .update({ clock_out_at: new Date().toISOString(), status: "job_completed", clock_out_lat: lat ?? null, clock_out_lng: lng ?? null })
    .eq("id", job.id)
    .is("clock_out_at", null)
    .select("id");
  if (!updated?.length) return NextResponse.json({ success: true, alreadyClockedOut: true });

  await Promise.allSettled([
    supabase.from("status_history").insert({ booking_id: job.id, previous_status: "in_progress", new_status: "job_completed", changed_by: "cleaner", reason: `${auth.session.fullName} clocked out` }),
    supabase.from("activity_log").insert({ booking_id: job.id, action: `${auth.session.fullName} clocked out`, metadata: { lat: lat ?? null, lng: lng ?? null }, performed_by: "cleaner" }),
  ]);

  const billing = await processJobCompletion(job.id);
  return NextResponse.json({ success: true, invoiced: billing.done });
}
