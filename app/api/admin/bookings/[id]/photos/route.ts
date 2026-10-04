import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** GET — signed (1 hour) URLs for a job's before/after photos, plus clock times. */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const supabase = createAdminClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select("before_photos, after_photos, clock_in_at, clock_out_at, clock_in_lat, clock_in_lng, clock_out_lat, clock_out_lng, tasks")
    .eq("id", params.id)
    .maybeSingle();
  if (!booking) return NextResponse.json({ success: false, error: "Booking not found" }, { status: 404 });

  const sign = async (paths: string[] | null) => {
    if (!paths?.length) return [];
    const { data } = await supabase.storage.from("job-photos").createSignedUrls(paths, 3600);
    return (data ?? []).flatMap((d) => (d.signedUrl ? [d.signedUrl] : []));
  };
  const [before, after] = await Promise.all([sign(booking.before_photos), sign(booking.after_photos)]);

  return NextResponse.json({
    success: true, before, after,
    clockInAt: booking.clock_in_at, clockOutAt: booking.clock_out_at,
    clockIn: booking.clock_in_lat != null ? { lat: booking.clock_in_lat, lng: booking.clock_in_lng } : null,
    clockOut: booking.clock_out_lat != null ? { lat: booking.clock_out_lat, lng: booking.clock_out_lng } : null,
    tasks: booking.tasks ?? [],
  });
}
