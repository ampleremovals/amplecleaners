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
    const { name, category, description, subject, heading, body, cta_label, cta_url, sms_body, whatsapp_body, subject_b } = templateToRow(def);
    await db.from("email_templates").update({ name, category, description, subject, heading, body, cta_label, cta_url, sms_body, whatsapp_body, subject_b, updated_at: new Date().toISOString(), updated_by: auth.userId }).eq("key", params.key);
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
  const bad = unknownVariables(t.subject, t.heading, t.body, t.cta_label, t.cta_url, t.sms_body, t.whatsapp_body, t.subject_b);
  if (bad.length) return NextResponse.json({ success: false, error: `Unknown variable${bad.length > 1 ? "s" : ""}: ${bad.map((b) => `{{${b}}}`).join(", ")}` }, { status: 400 });
  const { data: current } = await db.from("email_templates").select("category").eq("key", params.key).maybeSingle();
  if (!current) return NextResponse.json({ success: false, error: "Template not found" }, { status: 404 });
  // Texts are for booking-critical messages only. Marketing by SMS/WhatsApp needs separate consent.
  if (current.category === "marketing" && (t.sms_body || t.whatsapp_body)) return NextResponse.json({ success: false, error: "Marketing emails can't have a text-message version" }, { status: 400 });
  const patch: Record<string, unknown> = {
    subject: t.subject, heading: t.heading, body: t.body, cta_label: t.cta_label || null, cta_url: t.cta_url || null,
    updated_at: new Date().toISOString(), updated_by: auth.userId,
  };
  if (t.name) patch.name = t.name;
  if ("sms_body" in t) patch.sms_body = t.sms_body || null;
  if ("whatsapp_body" in t) patch.whatsapp_body = t.whatsapp_body || null;
  if ("subject_b" in t) patch.subject_b = t.subject_b || null;
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
