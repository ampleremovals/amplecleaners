import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const schema = z.object({ paused: z.boolean() });

/**
 * POST { paused } — the kill switch for ALL automatic email (journeys, campaigns, reminders from the engine).
 * Booking emails sent directly by the system (quotes, invoices, receipts) are not affected.
 */
export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 });
  const { error } = await createAdminClient().from("settings").update({ email_paused: parsed.data.paused }).eq("id", 1);
  if (error) return NextResponse.json({ success: false, error: "Couldn't save" }, { status: 500 });
  return NextResponse.json({ success: true });
}
