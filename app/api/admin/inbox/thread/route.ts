/* eslint-disable @typescript-eslint/no-explicit-any -- untyped Supabase client */
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/server";
import { pauseFollowups, resumeFollowups } from "@/lib/email/inbound";

export const dynamic = "force-dynamic";

const emailParam = z.string().trim().toLowerCase().email();

/** GET ?email= — the whole conversation: their messages, ours, and the automatic emails we sent them. */
export async function GET(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const email = emailParam.safeParse(new URL(req.url).searchParams.get("email"));
  if (!email.success) return NextResponse.json({ success: false, error: "Invalid email" }, { status: 400 });
  const db: any = createAdminClient();

  const [{ data: msgs }, { data: auto }, { data: cust }] = await Promise.all([
    db.from("inbox_messages").select("id, direction, subject, body_text, body_available, auto_reply, created_at, read_at, handled_at, sent_by").ilike("email", email.data).order("created_at", { ascending: true }).limit(200),
    db.from("email_outbox").select("id, template_key, category, subject, sent_at, status").ilike("to_email", email.data).eq("status", "sent").neq("template_key", "inbox reply").order("sent_at", { ascending: true }).limit(100),
    db.from("customers").select("id, full_name, phone, followups_paused_until").ilike("email", email.data).limit(1).maybeSingle(),
  ]);
  const { data: bookings } = cust ? await db.from("bookings").select("id, reference, service_type, status, clean_date").eq("customer_id", cust.id).order("created_at", { ascending: false }).limit(5) : { data: [] };

  const items = [
    ...(msgs ?? []).map((m: any) => ({ kind: m.direction === "in" ? "in" : "out", id: m.id, at: m.created_at, subject: m.subject, body: m.body_text, bodyAvailable: m.body_available, autoReply: m.auto_reply, sentBy: m.sent_by, handled: !!m.handled_at })),
    ...(auto ?? []).filter((a: any) => a.sent_at).map((a: any) => ({ kind: "auto", id: a.id, at: a.sent_at, subject: a.subject ?? a.template_key, body: null, category: a.category })),
  ].sort((a, b) => a.at.localeCompare(b.at));
  const paused = !!cust?.followups_paused_until && new Date(cust.followups_paused_until).getTime() > Date.now();
  return NextResponse.json({
    success: true, email: email.data, items,
    customer: cust ? { id: cust.id, name: cust.full_name, phone: cust.phone, paused, pausedUntil: paused ? cust.followups_paused_until : null } : null,
    bookings: bookings ?? [],
    lastSubject: [...(msgs ?? [])].reverse().find((m: any) => m.subject)?.subject ?? null,
  });
}

const actionSchema = z.object({ email: emailParam, action: z.enum(["read", "handled", "reopen", "pause", "resume"]) });

/** POST { email, action } — mark read / handled / reopen, or pause / resume the sales follow-ups by hand. */
export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const parsed = actionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 });
  const { email, action } = parsed.data;
  const db: any = createAdminClient();
  const now = new Date().toISOString();
  const { data: cust } = await db.from("customers").select("id").ilike("email", email).limit(1).maybeSingle();

  if (action === "read") await db.from("inbox_messages").update({ read_at: now }).ilike("email", email).eq("direction", "in").is("read_at", null);
  if (action === "handled") await db.from("inbox_messages").update({ read_at: now, handled_at: now }).ilike("email", email).eq("direction", "in").is("handled_at", null);
  if (action === "reopen") await db.from("inbox_messages").update({ handled_at: null }).ilike("email", email).eq("direction", "in");
  if (action === "pause") await pauseFollowups(email, cust?.id ?? null, 7, "paused by admin");
  if (action === "resume") await resumeFollowups(email, cust?.id ?? null);
  return NextResponse.json({ success: true });
}
