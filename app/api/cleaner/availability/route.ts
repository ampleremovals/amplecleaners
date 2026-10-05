import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireCleaner } from "@/lib/cleaner-auth";
import { createAdminClient } from "@/lib/supabase/server";
import { toMinutes } from "@/lib/automation/matching";

export const runtime = "nodejs";

const MAX_SLOTS = 21;
const MIN_SLOT_MIN = 60;
const time = z.string().regex(/^\d{2}:\d{2}$/);
const slotsSchema = z.object({
  slots: z.array(z.object({ dayOfWeek: z.number().int().min(0).max(6), startTime: time, endTime: time })).max(MAX_SLOTS),
});

/** GET — the cleaner's weekly availability (HH:MM). */
export async function GET() {
  const auth = await requireCleaner();
  if (!auth.ok) return auth.response;
  const { data } = await createAdminClient().from("cleaner_availability").select("day_of_week, start_time, end_time").eq("cleaner_id", auth.session.cleanerId).order("day_of_week").order("start_time");
  return NextResponse.json({
    success: true,
    slots: (data ?? []).map((s) => ({ dayOfWeek: s.day_of_week as number, startTime: String(s.start_time).slice(0, 5), endTime: String(s.end_time).slice(0, 5) })),
  });
}

/**
 * PUT { slots } — replace the whole weekly pattern. Validated server-side: end
 * after start, at least an hour long, and no overlaps within a day. Existing
 * assigned jobs are untouched (use time off / decline to give those back).
 */
export async function PUT(req: NextRequest) {
  const auth = await requireCleaner();
  if (!auth.ok) return auth.response;

  const parsed = slotsSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, error: "Invalid availability." }, { status: 400 });

  const byDay = new Map<number, { s: number; e: number }[]>();
  for (const slot of parsed.data.slots) {
    const s = toMinutes(slot.startTime)!;
    const e = toMinutes(slot.endTime)!;
    if (e - s < MIN_SLOT_MIN) return NextResponse.json({ success: false, error: "Each slot must be at least an hour, and end after it starts." }, { status: 400 });
    const day = byDay.get(slot.dayOfWeek) ?? [];
    if (day.some((x) => s < x.e && e > x.s)) return NextResponse.json({ success: false, error: "Two slots on the same day overlap." }, { status: 400 });
    day.push({ s, e });
    byDay.set(slot.dayOfWeek, day);
  }

  const supabase = createAdminClient();
  const { error: delErr } = await supabase.from("cleaner_availability").delete().eq("cleaner_id", auth.session.cleanerId);
  if (delErr) return NextResponse.json({ success: false, error: "Couldn't save." }, { status: 500 });
  if (parsed.data.slots.length) {
    const { error } = await supabase.from("cleaner_availability").insert(
      parsed.data.slots.map((s) => ({ cleaner_id: auth.session.cleanerId, day_of_week: s.dayOfWeek, start_time: s.startTime, end_time: s.endTime })),
    );
    if (error) return NextResponse.json({ success: false, error: "Couldn't save." }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
