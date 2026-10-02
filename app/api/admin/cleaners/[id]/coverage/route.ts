import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/server";

/** POST — add a postcode-prefix coverage area. DELETE — remove one (?areaId=). */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null) as { postcodePrefix?: string } | null;
  const prefix = body?.postcodePrefix?.trim().toUpperCase();
  if (!prefix) return NextResponse.json({ success: false, error: "Missing postcodePrefix" }, { status: 400 });

  const supabase = createAdminClient();
  const { error } = await supabase.from("cleaner_coverage_areas").insert({ cleaner_id: params.id, postcode_prefix: prefix });
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const areaId = req.nextUrl.searchParams.get("areaId");
  if (!areaId) return NextResponse.json({ success: false, error: "Missing areaId" }, { status: 400 });

  const supabase = createAdminClient();
  const { error } = await supabase.from("cleaner_coverage_areas").delete().eq("id", areaId);
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
