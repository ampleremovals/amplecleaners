import { NextResponse } from "next/server";
import { runQuoteFollowupMorning, runDepositFollowupMorning } from "@/lib/followups/engine";

/**
 * GET /api/cron/followup-morning — run daily (e.g. 10am).
 * Email always (days 1-7), SMS only days 1-5. See lib/followups/engine.ts.
 */
export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const [quote, deposit] = await Promise.all([runQuoteFollowupMorning(), runDepositFollowupMorning()]);
    return NextResponse.json({ success: true, quote, deposit });
  } catch (error) {
    console.error("followup-morning cron error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
