import { NextRequest, NextResponse } from "next/server";
import { requireCleaner, todayInLondon } from "@/lib/cleaner-auth";
import { getOwnedJob, locationSchema } from "@/lib/cleaner-jobs";
import { createAdminClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export const runtime = "nodejs";

/** POST /api/cleaner/jobs/[id]/clock-in — start the job (location-stamped). */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireCleaner();
  if (!auth.ok) return auth.response;
  const owned = await getOwnedJob(auth.session.cleanerId, params.id);
  if (!owned.ok) return owned.response;
  const { job } = owned;

  if (job.clock_in_at) return NextResponse.json({ success: true, alreadyClockedIn: true });
  if (job.status !== "cleaner_assigned") {
    return NextResponse.json({ success: false, error: "This job isn't ready to start." }, { status: 409 });
  }
  if (job.clean_date && job.clean_date > todayInLondon()) {
    return NextResponse.json({ success: false, error: `This job is on ${formatDate(job.clean_date)} — you can clock in on the day.` }, { status: 400 });
  }

  const loc = locationSchema.safeParse(await req.json().catch(() => ({})));
  const { lat, lng } = loc.success ? loc.data : { lat: undefined, lng: undefined };

  const supabase = createAdminClient();
  const { data: updated } = await supabase
    .from("bookings")
    .update({ clock_in_at: new Date().toISOString(), status: "in_progress", clock_in_lat: lat ?? null, clock_in_lng: lng ?? null })
    .eq("id", job.id)
    .is("clock_in_at", null)
    .select("id");
  if (!updated?.length) return NextResponse.json({ success: true, alreadyClockedIn: true });

  await Promise.allSettled([
    supabase.from("status_history").insert({ booking_id: job.id, previous_status: "cleaner_assigned", new_status: "in_progress", changed_by: "cleaner", reason: `${auth.session.fullName} clocked in` }),
    supabase.from("activity_log").insert({ booking_id: job.id, action: `${auth.session.fullName} clocked in`, metadata: { lat: lat ?? null, lng: lng ?? null }, performed_by: "cleaner" }),
  ]);
  return NextResponse.json({ success: true });
}
