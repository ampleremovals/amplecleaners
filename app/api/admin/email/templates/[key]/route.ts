/* eslint-disable @typescript-eslint/no-explicit-any -- untyped Supabase client */
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/server";
import { templateEditSchema, unknownVariables } from "@/lib/email/admin";
import { TEMPLATES } from "@/lib/email/defaults";
import { templateToRow } from "@/lib/email/store";

export const dynamic = "force-dynamic";

/** PATCH — save edits. `{ reset: true }` restores the built-in default text. */
export async function PATCH(req: Request, { params }: { params: { key: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const db: any = createAdminClient();
  const raw = await req.json().catch(() => null);

  if (raw?.reset === true) {
    const def = TEMPLATES.find((t) => t.key === params.key);
    if (!def) return NextResponse.json({ success: false, error: "No built-in default for this template" }, { status: 404 });
    const { name, category, description, subject, heading, body, cta_label, cta_url } = templateToRow(def);
    await db.from("email_templates").update({ name, category, description, subject, heading, body, cta_label, cta_url, updated_at: new Date().toISOString(), updated_by: auth.userId }).eq("key", params.key);
    return NextResponse.json({ success: true });
  }

  // Switching on/off alone is allowed without resending the text.
  if (raw && Object.keys(raw).length === 1 && typeof raw.enabled === "boolean") {
    await db.from("email_templates").update({ enabled: raw.enabled, updated_at: new Date().toISOString(), updated_by: auth.userId }).eq("key", params.key);
    return NextResponse.json({ success: true });
  }

  const parsed = templateEditSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message ?? "Invalid" }, { status: 400 });
  const t = parsed.data;
  const bad = unknownVariables(t.subject, t.heading, t.body, t.cta_label, t.cta_url);
  if (bad.length) return NextResponse.json({ success: false, error: `Unknown variable${bad.length > 1 ? "s" : ""}: ${bad.map((b) => `{{${b}}}`).join(", ")}` }, { status: 400 });
  const patch: Record<string, unknown> = {
    subject: t.subject, heading: t.heading, body: t.body, cta_label: t.cta_label || null, cta_url: t.cta_url || null,
    updated_at: new Date().toISOString(), updated_by: auth.userId,
  };
  if (t.name) patch.name = t.name;
  if (typeof t.enabled === "boolean") patch.enabled = t.enabled;
  const { data, error } = await db.from("email_templates").update(patch).eq("key", params.key).select("key");
  if (error || !data?.length) return NextResponse.json({ success: false, error: "Couldn't save the template" }, { status: error ? 500 : 404 });
  return NextResponse.json({ success: true });
}

/** DELETE — custom templates only. */
export async function DELETE(_req: Request, { params }: { params: { key: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { data } = await (createAdminClient() as any).from("email_templates").delete().eq("key", params.key).eq("is_custom", true).select("key");
  if (!data?.length) return NextResponse.json({ success: false, error: "Only custom templates can be deleted" }, { status: 400 });
  return NextResponse.json({ success: true });
}
