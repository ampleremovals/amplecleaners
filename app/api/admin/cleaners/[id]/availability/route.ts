import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/server";

/** POST — add an availability slot. DELETE — remove one (?slotId=). */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null) as { dayOfWeek?: number; startTime?: string; endTime?: string } | null;
  if (body?.dayOfWeek == null || !body.startTime || !body.endTime) {
    return NextResponse.json({ success: false, error: "Missing dayOfWeek, startTime or endTime" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("cleaner_availability").insert({
    cleaner_id: params.id, day_of_week: body.dayOfWeek, start_time: body.startTime, end_time: body.endTime,
  });
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const slotId = req.nextUrl.searchParams.get("slotId");
  if (!slotId) return NextResponse.json({ success: false, error: "Missing slotId" }, { status: 400 });

  const supabase = createAdminClient();
  const { error } = await supabase.from("cleaner_availability").delete().eq("id", slotId);
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
