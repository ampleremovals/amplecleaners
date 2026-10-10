import { NextResponse } from "next/server";
import { verifyUnsubscribeToken } from "@/lib/email/unsubscribe";
import { suppress, suppressionFor, unsuppress } from "@/lib/email/suppression";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const mask = (email: string) => email.replace(/^(.).*(@.*)$/, "$1•••$2");

/** GET: what the unsubscribe page needs to show (masked address + current state). */
export async function GET(_req: Request, { params }: { params: { token: string } }) {
  const email = verifyUnsubscribeToken(params.token);
  if (!email) return NextResponse.json({ success: false, error: "This link isn't valid." }, { status: 400 });
  return NextResponse.json({ success: true, email: mask(email), unsubscribed: (await suppressionFor(email)) !== "none" });
}

/**
 * POST: unsubscribe from marketing email. This is also the RFC 8058 "one-click" endpoint that Gmail and
 * Yahoo call when a customer presses their own Unsubscribe button, so it must work with no body and no
 * cookies. `?undo=1` re-subscribes (from the page's "I changed my mind").
 */
export async function POST(req: Request, { params }: { params: { token: string } }) {
  const limited = await rateLimit(req, "unsubscribe", 30, 600);
  if (limited) return limited;
  const email = verifyUnsubscribeToken(params.token);
  if (!email) return NextResponse.json({ success: false, error: "This link isn't valid." }, { status: 400 });
  if (new URL(req.url).searchParams.get("undo") === "1") await unsuppress(email);
  else await suppress(email, "marketing", "unsubscribed by customer");
  return NextResponse.json({ success: true });
}

