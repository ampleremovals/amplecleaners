import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const supabase = createAdminClient();
  const [{ data: cleaner, error }, { data: availability }, { data: coverage }, { data: upcomingJobs }] = await Promise.all([
    supabase.from("cleaners").select("*").eq("id", params.id).maybeSingle(),
    supabase.from("cleaner_availability").select("*").eq("cleaner_id", params.id).order("day_of_week"),
    supabase.from("cleaner_coverage_areas").select("*").eq("cleaner_id", params.id),
    supabase.from("bookings").select("id, reference, clean_date, status").eq("assigned_cleaner_id", params.id).gte("clean_date", new Date().toISOString().slice(0, 10)).order("clean_date"),
  ]);
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  if (!cleaner) return NextResponse.json({ success: false, error: "Cleaner not found" }, { status: 404 });

  return NextResponse.json({
    success: true,
    cleaner,
    availability: availability ?? [],
    coverage: coverage ?? [],
    upcomingJobs: upcomingJobs ?? [],
  });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 });

  const allowed = ["full_name", "email", "phone", "is_active", "dbs_verified", "dbs_check_url", "pay_rate_per_hour", "notes"] as const;
  const update: Record<string, unknown> = {};
  for (const key of allowed) if (key in body) update[key] = body[key];

  const supabase = createAdminClient();
  const { error } = await supabase.from("cleaners").update(update).eq("id", params.id);
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
