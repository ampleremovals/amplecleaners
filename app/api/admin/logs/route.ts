import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** GET /api/admin/logs?level=error|warn|info|all&days=7 — recent server_logs, newest first. */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const params = new URL(req.url).searchParams;
  const level = params.get("level") ?? "all";
  const days = Math.min(90, Math.max(1, Number(params.get("days")) || 7));
  const since = new Date(Date.now() - days * 86_400_000).toISOString();

  let query = createAdminClient()
    .from("server_logs")
    .select("id, level, message, metadata, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(300);
  if (level !== "all") query = query.eq("level", level);

  const { data, error } = await query;
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, logs: data ?? [] });
}
