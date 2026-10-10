import { NextResponse } from "next/server";
import { runEmailEngine } from "@/lib/email/dispatch";
import { logError } from "@/lib/log-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * The email engine tick: schedules whatever journey emails have become due, then sends what's due.
 * Called every 5 minutes by Supabase pg_cron (see scripts/schedule-email-dispatch.ts), and once a day
 * by the morning follow-up cron as a safety net. Safe to call as often as you like (idempotent).
 */
async function run(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json({ success: true, ...(await runEmailEngine()) });
  } catch (e) {
    await logError({ message: "email dispatch failed", metadata: { error: String(e) } });
    return NextResponse.json({ success: false, error: "dispatch failed" }, { status: 500 });
  }
}

export const GET = run;
export const POST = run;
