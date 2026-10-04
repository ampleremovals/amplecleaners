/* eslint-disable @typescript-eslint/no-explicit-any -- untyped Supabase client */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/server";
import { sendEmailSafe } from "@/lib/notify";
import { emailShell } from "@/lib/email-templates";

export const runtime = "nodejs";

/** POST /api/admin/applications/[id]/reject { note? } — marks it rejected and sends a kind, brief email (the internal note is never sent). */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  if (!z.string().uuid().safeParse(params.id).success) return NextResponse.json({ success: false, error: "Invalid application" }, { status: 400 });

  const body = z.object({ note: z.string().max(500).optional() }).safeParse(await req.json().catch(() => ({})));
  const supabase: any = createAdminClient();
  const { data: claimed } = await supabase
    .from("cleaner_applications")
    .update({ status: "rejected", reviewed_at: new Date().toISOString(), review_note: body.success ? body.data.note ?? null : null })
    .eq("id", params.id)
    .eq("status", "new")
    .select("full_name, email");
  const app = claimed?.[0];
  if (!app) return NextResponse.json({ success: false, error: "This application has already been reviewed." }, { status: 409 });

  await sendEmailSafe({
    to: app.email,
    subject: "Your Ample Cleaners application",
    context: "cleaner application rejected",
    html: emailShell({
      heading: "Thank you for applying",
      bodyHtml: `<p>Hi ${String(app.full_name).split(" ")[0]},</p><p>Thank you for your interest in joining Ample Cleaners. After reviewing applications we aren't able to offer you a place right now, but we really appreciate you taking the time to apply and wish you every success.</p>`,
    }),
  });
  return NextResponse.json({ success: true });
}
