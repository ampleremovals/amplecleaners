/* eslint-disable @typescript-eslint/no-explicit-any -- untyped Supabase client */
import { createAdminClient } from "@/lib/supabase/server";
import { AUTOMATIONS, TEMPLATES, type AutomationDef, type TemplateDef } from "@/lib/email/defaults";

export interface TemplateRow {
  key: string; name: string; category: "service" | "marketing"; description: string | null; subject: string; heading: string; body: string;
  cta_label: string | null; cta_url: string | null; enabled: boolean; is_custom: boolean; updated_at: string; updated_by: string | null;
}
export interface AutomationRow { key: string; enabled: boolean; steps: { template: string; hours: number }[]; updated_at: string }

export const templateToRow = (t: TemplateDef) => ({
  key: t.key, name: t.name, category: t.category, description: t.description, subject: t.subject, heading: t.heading,
  body: t.body, cta_label: t.ctaLabel ?? null, cta_url: t.ctaUrl ?? null, is_custom: !!t.campaign,
});

/** Inserts any default template or journey that doesn't exist yet. Never overwrites the owner's edits. */
export async function ensureSeeded(): Promise<void> {
  const db: any = createAdminClient();
  const [{ data: haveT }, { data: haveA }] = await Promise.all([
    db.from("email_templates").select("key"),
    db.from("email_automations").select("key"),
  ]);
  const t = new Set((haveT ?? []).map((r: any) => r.key));
  const a = new Set((haveA ?? []).map((r: any) => r.key));
  const newT = TEMPLATES.filter((x) => !t.has(x.key)).map(templateToRow);
  const newA = AUTOMATIONS.filter((x) => !a.has(x.key)).map((x) => ({ key: x.key, enabled: true, steps: x.steps }));
  if (newT.length) await db.from("email_templates").upsert(newT, { onConflict: "key", ignoreDuplicates: true });
  if (newA.length) await db.from("email_automations").upsert(newA, { onConflict: "key", ignoreDuplicates: true });
}

export async function loadTemplates(): Promise<Map<string, TemplateRow>> {
  const { data } = await (createAdminClient() as any).from("email_templates").select("*");
  return new Map((data ?? []).map((r: TemplateRow) => [r.key, r]));
}

export async function loadAutomations(): Promise<Map<string, AutomationRow>> {
  const { data } = await (createAdminClient() as any).from("email_automations").select("*");
  const m = new Map<string, AutomationRow>((data ?? []).map((r: AutomationRow) => [r.key, r]));
  // A journey whose row is missing is treated as its default, switched on.
  for (const d of AUTOMATIONS) if (!m.has(d.key)) m.set(d.key, { key: d.key, enabled: true, steps: d.steps, updated_at: "" });
  return m;
}

export const automationDef = (key: string): AutomationDef | undefined => AUTOMATIONS.find((a) => a.key === key);
