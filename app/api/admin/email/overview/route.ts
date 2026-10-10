/* eslint-disable @typescript-eslint/no-explicit-any -- untyped Supabase client */
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/server";
import { AUTOMATIONS, COMMON_VARIABLES } from "@/lib/email/defaults";
import { ensureSeeded, loadAutomations, loadTemplates } from "@/lib/email/store";
import { emailStats } from "@/lib/email/stats";
import { londonHour, SEND_HOURS, MARKETING_GAP_DAYS } from "@/lib/email/dispatch";

export const dynamic = "force-dynamic";

/** GET /api/admin/email/overview — journeys (with their emails), templates, 30-day performance and system health. */
export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  await ensureSeeded();
  const db: any = createAdminClient();
  const [autos, tpls, stats, { count: suppressed }, { data: lastRun }] = await Promise.all([
    loadAutomations(), loadTemplates(), emailStats(30),
    db.from("email_suppressions").select("email", { count: "exact", head: true }),
    db.from("email_outbox").select("sent_at").eq("status", "sent").in("category", ["service", "marketing"]).order("sent_at", { ascending: false }).limit(1),
  ]);
  const byTemplate = new Map(stats.templates.map((t) => [t.key, t]));
  const journeys = AUTOMATIONS.map((d) => {
    const row = autos.get(d.key)!;
    return {
      key: d.key, name: d.name, description: d.description, timing: d.timing, enabled: row.enabled,
      steps: row.steps.map((s, i) => ({ ...s, defaultHours: d.steps[i]?.hours ?? s.hours, name: tpls.get(s.template)?.name ?? s.template, category: tpls.get(s.template)?.category ?? "marketing", stats: byTemplate.get(s.template) ?? null })),
    };
  });
  return NextResponse.json({
    success: true, journeys, stats, suppressed: suppressed ?? 0,
    templates: [...tpls.values()].map((t) => ({ key: t.key, name: t.name, category: t.category, enabled: t.enabled, is_custom: t.is_custom })),
    variables: COMMON_VARIABLES,
    health: {
      trackingConfigured: !!process.env.RESEND_WEBHOOK_SECRET,
      schedulerConfigured: !!process.env.CRON_SECRET,
      lastAutomatedSend: lastRun?.[0]?.sent_at ?? null,
      sendingNow: londonHour(new Date()) >= SEND_HOURS.from && londonHour(new Date()) < SEND_HOURS.until,
      sendHours: `${SEND_HOURS.from}:00 to ${SEND_HOURS.until}:00 London time`,
      marketingGapDays: MARKETING_GAP_DAYS,
    },
  });
}
