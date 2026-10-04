import { NextResponse } from "next/server";
import { runQuoteFollowupEvening, runDepositFollowupEvening } from "@/lib/followups/engine";
import { runEveningAutomation } from "@/lib/automation/daily";
import { logError } from "@/lib/log-error";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET /api/cron/followup-evening — runs daily at 6pm.
 *  1. WhatsApp quote/deposit follow-ups.
 *  2. Day-before reminders to cleaners (push) and customers.
 */
export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  const [followups, automation] = await Promise.allSettled([
    Promise.all([runQuoteFollowupEvening(), runDepositFollowupEvening()]),
    runEveningAutomation(),
  ]);
  if (followups.status === "rejected") await logError({ message: "followup-evening failed", metadata: { error: String(followups.reason) } });
  if (automation.status === "rejected") await logError({ message: "evening automation failed", metadata: { error: String(automation.reason) } });

  return NextResponse.json({
    success: followups.status === "fulfilled" && automation.status === "fulfilled",
    followups: followups.status === "fulfilled" ? { quote: followups.value[0], deposit: followups.value[1] } : null,
    automation: automation.status === "fulfilled" ? automation.value : null,
  });
}
