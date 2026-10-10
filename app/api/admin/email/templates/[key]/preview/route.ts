/* eslint-disable @typescript-eslint/no-explicit-any -- untyped Supabase client */
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { loadCompany } from "@/lib/email/config";
import { renderTemplate } from "@/lib/email/render";
import { SAMPLE_VARS, templateEditSchema, unknownVariables } from "@/lib/email/admin";
import { sendRendered } from "@/lib/email/dispatch";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST — render a template with sample data. Send the unsaved draft in the body to preview as you type.
 * With `{ send: true }` it also emails the preview to the signed-in admin ("Send me a test").
 */
export async function POST(req: Request, { params }: { params: { key: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const body = await req.json().catch(() => ({}));
  const { data: saved } = await (createAdminClient() as any).from("email_templates").select("*").eq("key", params.key).maybeSingle();
  if (!saved) return NextResponse.json({ success: false, error: "Template not found" }, { status: 404 });

  let tpl = saved;
  if (body?.draft) {
    const parsed = templateEditSchema.safeParse(body.draft);
    if (!parsed.success) return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message ?? "Invalid draft" }, { status: 400 });
    tpl = { ...saved, ...parsed.data, cta_label: parsed.data.cta_label || null, cta_url: parsed.data.cta_url || null, sms_body: parsed.data.sms_body || null, whatsapp_body: parsed.data.whatsapp_body || null, subject_b: parsed.data.subject_b || null };
  }
  const company = await loadCompany();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const to = user?.email ?? "preview@example.com";
  const rendered = renderTemplate(tpl, SAMPLE_VARS, company, to);
  const unknown = unknownVariables(tpl.subject, tpl.heading, tpl.body, tpl.cta_label, tpl.cta_url, tpl.sms_body, tpl.whatsapp_body, tpl.subject_b);
  const subjectB = tpl.subject_b ? renderTemplate(tpl, SAMPLE_VARS, company, to, "B").subject : null;

  let sentTo: string | null = null;
  if (body?.send === true) {
    const limited = await rateLimit(req, "email-test", 20, 3600);
    if (limited) return limited;
    if (!user?.email) return NextResponse.json({ success: false, error: "Your admin account has no email address" }, { status: 400 });
    const res = await sendRendered({ to: user.email, rendered: { ...rendered, subject: `[Test] ${rendered.subject}` }, company });
    if (res.error) return NextResponse.json({ success: false, error: `The test email couldn't be sent: ${res.error}` }, { status: 502 });
    sentTo = user.email;
  }
  return NextResponse.json({ success: true, subject: rendered.subject, subjectB, sms: rendered.sms, whatsapp: rendered.whatsapp, html: rendered.html, unknownVariables: unknown, sentTo });
}
