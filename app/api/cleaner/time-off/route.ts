/* eslint-disable @typescript-eslint/no-explicit-any -- untyped Supabase client */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireCleaner, todayInLondon } from "@/lib/cleaner-auth";
import { createAdminClient } from "@/lib/supabase/server";
import { releaseJob } from "@/lib/bookings/release";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_DAYS = 90;
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);

/** GET — this cleaner's upcoming and current time off. */
export async function GET() {
  const auth = await requireCleaner();
  if (!auth.ok) return auth.response;
  const { data } = await createAdminClient()
    .from("cleaner_time_off")
    .select("id, start_date, end_date, reason")
    .eq("cleaner_id", auth.session.cleanerId)
    .gte("end_date", todayInLondon())
    .order("start_date");
  return NextResponse.json({ success: true, timeOff: data ?? [] });
}

const createSchema = z.object({ startDate: isoDate, endDate: isoDate, reason: z.string().trim().max(200).optional() });

/**
 * POST — book time off. Any not-yet-started job the cleaner already has inside
 * those dates is released and re-matched automatically (and the admin is told),
 * so a holiday never leaves a customer without a cleaner unnoticed.
 */
export async function POST(req: NextRequest) {
  const auth = await requireCleaner();
  if (!auth.ok) return auth.response;

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, error: "Please choose valid dates." }, { status: 400 });
  const { startDate, endDate, reason } = parsed.data;
  const today = todayInLondon();
  if (startDate < today) return NextResponse.json({ success: false, error: "Time off can't start in the past." }, { status: 400 });
  if (endDate < startDate) return NextResponse.json({ success: false, error: "The end date must be on or after the start date." }, { status: 400 });
  if (daysBetween(startDate, endDate) >= MAX_DAYS) return NextResponse.json({ success: false, error: `Time off is limited to ${MAX_DAYS} days at a time — please call the office for longer.` }, { status: 400 });

  const supabase: any = createAdminClient();
  const { data: row, error } = await supabase
    .from("cleaner_time_off")
    .insert({ cleaner_id: auth.session.cleanerId, start_date: startDate, end_date: endDate, reason: reason || null })
    .select("id")
    .single();
  if (error || !row) return NextResponse.json({ success: false, error: "Couldn't save your time off." }, { status: 500 });

  const { data: jobs } = await supabase
    .from("bookings")
    .select("id")
    .eq("assigned_cleaner_id", auth.session.cleanerId)
    .eq("status", "cleaner_assigned")
    .gte("clean_date", startDate)
    .lte("clean_date", endDate);

  let released = 0;
  let reassigned = 0;
  for (const j of jobs ?? []) {
    const r = await releaseJob(j.id, auth.session.cleanerId, { reason: reason || "Time off", kind: "time_off" });
    if (r.ok) { released++; if (r.reassigned) reassigned++; }
  }
  return NextResponse.json({ success: true, id: row.id, released, reassigned });
}

/** DELETE ?id= — remove a time-off entry (only your own). */
export async function DELETE(req: NextRequest) {
  const auth = await requireCleaner();
  if (!auth.ok) return auth.response;
  const id = z.string().uuid().safeParse(new URL(req.url).searchParams.get("id"));
  if (!id.success) return NextResponse.json({ success: false, error: "Invalid id" }, { status: 400 });
  await createAdminClient().from("cleaner_time_off").delete().eq("id", id.data).eq("cleaner_id", auth.session.cleanerId);
  return NextResponse.json({ success: true });
}
