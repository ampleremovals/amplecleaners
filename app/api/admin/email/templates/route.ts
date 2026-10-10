/* eslint-disable @typescript-eslint/no-explicit-any -- untyped Supabase client */
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/server";
import { ensureSeeded } from "@/lib/email/store";
import { templateEditSchema, slugify, unknownVariables } from "@/lib/email/admin";
import { AUTOMATIONS, TEMPLATES } from "@/lib/email/defaults";

export const dynamic = "force-dynamic";

/** GET /api/admin/email/templates — every template, with which journey uses it and whether it differs from the default. */
export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  await ensureSeeded();
  const { data } = await (createAdminClient() as any).from("email_templates").select("*").order("category").order("name");
  const usedBy = new Map<string, string>();
  for (const a of AUTOMATIONS) for (const s of a.steps) usedBy.set(s.template, a.name);
  const defaults = new Map(TEMPLATES.map((t) => [t.key, t]));
  const templates = (data ?? []).map((t: any) => {
    const d = defaults.get(t.key);
    return { ...t, used_by: usedBy.get(t.key) ?? (t.is_custom ? "Campaigns" : null), edited: !!d && (d.subject !== t.subject || d.heading !== t.heading || d.body !== t.body || (d.ctaLabel ?? null) !== t.cta_label || (d.ctaUrl ?? null) !== t.cta_url) };
  });
  return NextResponse.json({ success: true, templates });
}

const createSchema = templateEditSchema.extend({ name: z.string().trim().min(2).max(120) });

/** POST /api/admin/email/templates — a new custom marketing template (for one-off campaigns). */
export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message ?? "Invalid" }, { status: 400 });
  const t = parsed.data;
  const bad = unknownVariables(t.subject, t.heading, t.body, t.cta_label, t.cta_url);
  if (bad.length) return NextResponse.json({ success: false, error: `Unknown variable${bad.length > 1 ? "s" : ""}: ${bad.map((b) => `{{${b}}}`).join(", ")}` }, { status: 400 });
  const key = `custom_${slugify(t.name)}`;
  const { error } = await (createAdminClient() as any).from("email_templates").insert({
    key, name: t.name, category: "marketing", description: "Custom template", subject: t.subject, heading: t.heading, body: t.body,
    cta_label: t.cta_label || null, cta_url: t.cta_url || null, enabled: true, is_custom: true, updated_by: auth.userId,
  });
  if (error) return NextResponse.json({ success: false, error: error.code === "23505" ? "A template with that name already exists" : "Couldn't create the template" }, { status: error.code === "23505" ? 409 : 500 });
  return NextResponse.json({ success: true, key });
}
