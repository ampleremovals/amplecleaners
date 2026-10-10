/* eslint-disable @typescript-eslint/no-explicit-any -- untyped Supabase client */
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/server";
import { AUTOMATIONS } from "@/lib/email/defaults";
import { ensureSeeded, loadAutomations } from "@/lib/email/store";

export const dynamic = "force-dynamic";

const schema = z.object({
  enabled: z.boolean().optional(),
  /** New timing for each step, in the same order as the journey's steps. */
  hours: z.array(z.number().int().min(0).max(24 * 365)).max(10).optional(),
});

/** PATCH — switch a journey on/off and/or change when each of its emails goes out. */
export async function PATCH(req: Request, { params }: { params: { key: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const def = AUTOMATIONS.find((a) => a.key === params.key);
  if (!def) return NextResponse.json({ success: false, error: "Unknown journey" }, { status: 404 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 });

  await ensureSeeded();
  const current = (await loadAutomations()).get(params.key)!;
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof parsed.data.enabled === "boolean") patch.enabled = parsed.data.enabled;
  if (parsed.data.hours) {
    if (parsed.data.hours.length !== current.steps.length) return NextResponse.json({ success: false, error: "Wrong number of steps" }, { status: 400 });
    patch.steps = current.steps.map((s, i) => ({ ...s, hours: parsed.data.hours![i] }));
  }
  const { error } = await (createAdminClient() as any).from("email_automations").update(patch).eq("key", params.key);
  if (error) return NextResponse.json({ success: false, error: "Couldn't save" }, { status: 500 });
  return NextResponse.json({ success: true });
}
