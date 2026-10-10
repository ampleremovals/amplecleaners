/* eslint-disable @typescript-eslint/no-explicit-any -- untyped Supabase client */
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const PAGE = 50;
const STATUSES = ["scheduled", "sent", "failed", "skipped", "cancelled"];

/** GET /api/admin/email/log?status=&q=&page= — every email the platform has sent or queued. */
export async function GET(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const sp = new URL(req.url).searchParams;
  const status = sp.get("status") ?? "";
  const q = (sp.get("q") ?? "").replace(/[%_\\,()*"']/g, "").trim().slice(0, 80);
  const page = Math.max(0, Number(sp.get("page")) || 0);

  let query = (createAdminClient() as any)
    .from("email_outbox")
    .select("id, template_key, category, to_email, subject, status, status_note, send_at, sent_at, delivered_at, opened_at, clicked_at, bounced_at, booking:bookings(reference)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(page * PAGE, page * PAGE + PAGE - 1);
  if (STATUSES.includes(status)) query = query.in("status", status === "scheduled" ? ["scheduled", "sending"] : [status]);
  if (q) query = query.or(`to_email.ilike.%${q}%,subject.ilike.%${q}%,template_key.ilike.%${q}%`);
  const { data, count, error } = await query;
  if (error) return NextResponse.json({ success: false, error: "Couldn't load the send log" }, { status: 500 });
  const rows = (data ?? []).map((r: any) => ({ ...r, reference: (Array.isArray(r.booking) ? r.booking[0] : r.booking)?.reference ?? null, booking: undefined }));
  return NextResponse.json({ success: true, rows, total: count ?? 0, page, pageSize: PAGE });
}
