/* eslint-disable @typescript-eslint/no-explicit-any -- untyped Supabase client */
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { suppress } from "@/lib/email/suppression";
import { verifySvix } from "@/lib/email/svix";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const COLUMN: Record<string, string> = {
  "email.delivered": "delivered_at", "email.opened": "opened_at", "email.clicked": "clicked_at", "email.bounced": "bounced_at",
};

/**
 * POST /api/webhooks/resend — delivery tracking. Records every event, stamps the outbox row, and
 * suppresses addresses that hard-bounce or report us as spam so we never email them again.
 */
export async function POST(req: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ success: false, error: "Webhook not configured" }, { status: 503 });
  const body = await req.text();
  const ok = verifySvix(body, { id: req.headers.get("svix-id"), timestamp: req.headers.get("svix-timestamp"), signature: req.headers.get("svix-signature") }, secret);
  if (!ok) return NextResponse.json({ success: false, error: "Invalid signature" }, { status: 400 });

  let event: any;
  try { event = JSON.parse(body); } catch { return NextResponse.json({ success: false, error: "Bad payload" }, { status: 400 }); }
  const type: string = event?.type ?? "";
  const resendId: string | undefined = event?.data?.email_id;
  if (!type.startsWith("email.") || !resendId) return NextResponse.json({ success: true, ignored: true });

  const db: any = createAdminClient();
  const { data: row } = await db.from("email_outbox").select("id, to_email").eq("resend_id", resendId).maybeSingle();
  await db.from("email_events").upsert(
    { event_id: req.headers.get("svix-id"), outbox_id: row?.id ?? null, resend_id: resendId, type: type.replace("email.", ""), meta: { bounce: event?.data?.bounce ?? null, click: event?.data?.click ?? null } },
    { onConflict: "event_id", ignoreDuplicates: true },
  );

  const column = COLUMN[type];
  if (row && column) {
    // first occurrence wins (a second open must not move the timestamp)
    await db.from("email_outbox").update({ [column]: new Date().toISOString() }).eq("id", row.id).is(column, null);
  }
  const recipient: string | undefined = row?.to_email ?? (Array.isArray(event?.data?.to) ? event.data.to[0] : undefined);
  if (recipient) {
    // "Transient" bounces (full mailbox) are retried by the provider; only permanent ones suppress.
    if (type === "email.bounced" && (event?.data?.bounce?.type ?? "Permanent") !== "Transient") await suppress(recipient, "all", "hard bounce");
    if (type === "email.complained") await suppress(recipient, "all", "spam complaint");
  }
  return NextResponse.json({ success: true });
}
