/* eslint-disable @typescript-eslint/no-explicit-any -- untyped Supabase client */
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/server";
import { INBOUND_REPLY_ADDRESS } from "@/lib/email/config";

export const dynamic = "force-dynamic";

/** GET /api/admin/inbox?filter=open|unread|all — conversations with customers, newest first. */
export async function GET(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const filter = new URL(req.url).searchParams.get("filter") ?? "open";
  const db: any = createAdminClient();
  const { data: msgs, error } = await db.from("inbox_messages").select("id, direction, customer_id, email, from_name, subject, body_text, auto_reply, created_at, read_at, handled_at").order("created_at", { ascending: false }).limit(800);
  if (error) return NextResponse.json({ success: false, error: "Couldn't load the inbox" }, { status: 500 });

  const byEmail = new Map<string, any>();
  for (const m of msgs ?? []) {
    const key = String(m.email).toLowerCase();
    let c = byEmail.get(key);
    if (!c) { c = { email: key, customerId: m.customer_id, name: m.from_name, lastAt: m.created_at, lastDirection: m.direction, subject: m.subject, snippet: (m.body_text ?? "").replace(/\s+/g, " ").slice(0, 140), unread: 0, open: false }; byEmail.set(key, c); }
    if (!c.customerId && m.customer_id) c.customerId = m.customer_id;
    if (!c.name && m.from_name) c.name = m.from_name;
    if (m.direction === "in" && !m.auto_reply) {
      if (!m.read_at) c.unread++;
      if (!m.handled_at) c.open = true;
    }
  }
  const ids = [...new Set([...byEmail.values()].map((c) => c.customerId).filter(Boolean))];
  if (ids.length) {
    const { data: cs } = await db.from("customers").select("id, full_name").in("id", ids);
    const names = new Map((cs ?? []).map((c: any) => [c.id, c.full_name]));
    for (const c of byEmail.values()) if (c.customerId && names.get(c.customerId)) c.name = names.get(c.customerId);
  }
  let conversations = [...byEmail.values()];
  const unreadTotal = conversations.reduce((s, c) => s + (c.unread > 0 ? 1 : 0), 0);
  if (filter === "unread") conversations = conversations.filter((c) => c.unread > 0);
  else if (filter === "open") conversations = conversations.filter((c) => c.open || c.unread > 0);
  return NextResponse.json({
    success: true, conversations, unreadTotal, total: byEmail.size,
    receiving: { configured: !!INBOUND_REPLY_ADDRESS, address: INBOUND_REPLY_ADDRESS || null, webhookConfigured: !!process.env.RESEND_WEBHOOK_SECRET },
  });
}
