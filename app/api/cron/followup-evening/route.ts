import { NextResponse } from "next/server";
import { runQuoteFollowupEvening, runDepositFollowupEvening } from "@/lib/followups/engine";

/** GET /api/cron/followup-evening — run daily (e.g. 6pm). WhatsApp only. */
export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const [quote, deposit] = await Promise.all([runQuoteFollowupEvening(), runDepositFollowupEvening()]);
    return NextResponse.json({ success: true, quote, deposit });
  } catch (error) {
    console.error("followup-evening cron error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
