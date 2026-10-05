import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/health — for uptime monitors (UptimeRobot, Better Stack, …). 200 when
 * the app can reach its database, 503 otherwise. Exposes nothing sensitive.
 */
export async function GET() {
  const started = Date.now();
  try {
    const { error } = await createAdminClient().from("settings").select("id").eq("id", 1).maybeSingle();
    if (error) throw error;
    return NextResponse.json(
      { ok: true, database: "up", responseMs: Date.now() - started, version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ ok: false, database: "down", responseMs: Date.now() - started }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
