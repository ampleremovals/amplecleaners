/* eslint-disable @typescript-eslint/no-explicit-any -- untyped Supabase client */
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/server";
import { enqueue } from "@/lib/email/outbox";
import { resolveSegment, SEGMENTS } from "@/lib/email/segments";
import { bookingLink, regularLink } from "@/lib/email/links";
import { SERVICE_LABELS, type ServiceType } from "@/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** GET — past campaigns with how many went out, plus the choices for a new one. */
export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const db: any = createAdminClient();
  const [{ data: campaigns }, { data: templates }] = await Promise.all([
    db.from("email_campaigns").select("*").order("created_at", { ascending: false }).limit(30),
    db.from("email_templates").select("key, name, category").eq("category", "marketing").eq("enabled", true).order("name"),
  ]);
  const ids = (campaigns ?? []).map((c: any) => c.id);
  const sent = new Map<string, { sent: number; opened: number; clicked: number; skipped: number }>();
  if (ids.length) {
    const { data: rows } = await db.from("email_outbox").select("campaign_id, status, opened_at, clicked_at").in("campaign_id", ids).limit(20000);
    for (const r of rows ?? []) {
      const s = sent.get(r.campaign_id) ?? { sent: 0, opened: 0, clicked: 0, skipped: 0 };
      if (r.status === "sent") { s.sent++; if (r.opened_at) s.opened++; if (r.clicked_at) s.clicked++; }
      if (r.status === "skipped" || r.status === "cancelled") s.skipped++;
      sent.set(r.campaign_id, s);
    }
  }
  return NextResponse.json({
    success: true,
    campaigns: (campaigns ?? []).map((c: any) => ({ ...c, ...(sent.get(c.id) ?? { sent: 0, opened: 0, clicked: 0, skipped: 0 }) })),
    segments: SEGMENTS, templates: templates ?? [],
  });
}

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  templateKey: z.string().trim().min(1).max(100),
  segment: z.string().trim().min(1).max(60),
  /** true = only count who would receive it. */
  dryRun: z.boolean().default(false),
});

/**
 * POST — queue a one-off campaign. Recipients come from the segment (unsubscribed and bounced addresses
 * already removed); the sender then applies sending hours and the one-marketing-email-per-3-days rule.
 */
export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  const { name, templateKey, segment, dryRun } = parsed.data;
  if (!SEGMENTS.some((s) => s.key === segment)) return NextResponse.json({ success: false, error: "Unknown audience" }, { status: 400 });

  const db: any = createAdminClient();
  const { data: tpl } = await db.from("email_templates").select("key, category, enabled").eq("key", templateKey).maybeSingle();
  if (!tpl || tpl.category !== "marketing" || !tpl.enabled) return NextResponse.json({ success: false, error: "Pick an enabled marketing template" }, { status: 400 });

  const recipients = await resolveSegment(segment);
  if (dryRun) return NextResponse.json({ success: true, count: recipients.length, sample: recipients.slice(0, 5).map((r) => r.firstName) });
  if (!recipients.length) return NextResponse.json({ success: false, error: "Nobody is in that audience right now" }, { status: 400 });
  if (recipients.length > 2000) return NextResponse.json({ success: false, error: "That audience is larger than 2,000. Pick a narrower one." }, { status: 400 });

  const { data: campaign, error } = await db.from("email_campaigns").insert({ name, template_key: templateKey, segment, recipient_count: recipients.length, created_by: auth.userId }).select("id").single();
  if (error || !campaign) return NextResponse.json({ success: false, error: "Couldn't create the campaign" }, { status: 500 });
  const queued = await enqueue(recipients.map((r) => ({
    templateKey, category: "marketing" as const, to: r.email, customerId: r.customerId, bookingId: null, campaignId: campaign.id,
    vars: { firstName: r.firstName, serviceLabel: SERVICE_LABELS[r.serviceType as ServiceType] ?? "Cleaning", serviceLower: (SERVICE_LABELS[r.serviceType as ServiceType] ?? "clean").toLowerCase(), bookingLink: bookingLink(r.serviceType), regularLink: regularLink() },
    dedupeKey: `campaign:${campaign.id}:${r.customerId}`,
  })));
  return NextResponse.json({ success: true, id: campaign.id, queued });
}
