import { NextResponse } from "next/server";
import { runQuoteFollowupMorning, runDepositFollowupMorning } from "@/lib/followups/engine";
import { runMorningAutomation } from "@/lib/automation/daily";
import { logError } from "@/lib/log-error";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET /api/cron/followup-morning — runs daily at 10am.
 *  1. Quote/deposit follow-ups (email always days 1-7, SMS days 1-5).
 *  2. Daily automation: recurring visits, auto-assign, invoice-on-complete
 *     safety net, overdue-invoice chasing, housekeeping (lib/automation/daily.ts).
 * Vercel Hobby allows only 2 crons, so the automation rides these two routes
 * instead of adding new entries — and each part is isolated so one failure
 * never skips the rest.
 */
export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  const [followups, automation] = await Promise.allSettled([
    Promise.all([runQuoteFollowupMorning(), runDepositFollowupMorning()]),
    runMorningAutomation(),
  ]);
  if (followups.status === "rejected") await logError({ message: "followup-morning failed", metadata: { error: String(followups.reason) } });
  if (automation.status === "rejected") await logError({ message: "morning automation failed", metadata: { error: String(automation.reason) } });

  return NextResponse.json({
    success: followups.status === "fulfilled" && automation.status === "fulfilled",
    followups: followups.status === "fulfilled" ? { quote: followups.value[0], deposit: followups.value[1] } : null,
    automation: automation.status === "fulfilled" ? automation.value : null,
  });
}
