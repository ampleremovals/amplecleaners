/* eslint-disable @typescript-eslint/no-explicit-any -- untyped Supabase client */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/server";
import { onboardCleaner } from "@/lib/cleaners/onboard";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * POST /api/admin/applications/[id]/approve { payRatePerHour? } — creates the
 * cleaner + login (+ the coverage prefixes they listed) and emails their
 * "set your password" link. DBS stays UNVERIFIED: an admin must still upload
 * and verify the certificate before auto-assign will ever pick them.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  if (!z.string().uuid().safeParse(params.id).success) return NextResponse.json({ success: false, error: "Invalid application" }, { status: 400 });

  const body = z.object({ payRatePerHour: z.number().positive().max(200).optional() }).safeParse(await req.json().catch(() => ({})));
  const supabase: any = createAdminClient();

  // Claim the application first so a double-click can't create two cleaners.
  const { data: claimed } = await supabase
    .from("cleaner_applications")
    .update({ status: "approved", reviewed_at: new Date().toISOString() })
    .eq("id", params.id)
    .eq("status", "new")
    .select("*");
  const app = claimed?.[0];
  if (!app) return NextResponse.json({ success: false, error: "This application has already been reviewed." }, { status: 409 });

  const prefixes = String(app.areas ?? "").split(/[,;\s]+/).filter(Boolean);
  const result = await onboardCleaner({
    fullName: app.full_name, email: app.email, phone: app.phone,
    payRatePerHour: body.success ? body.data.payRatePerHour : undefined, coveragePrefixes: prefixes,
  });
  if (!result.ok) {
    await supabase.from("cleaner_applications").update({ status: "new", reviewed_at: null }).eq("id", params.id); // release
    return NextResponse.json({ success: false, error: result.error }, { status: result.status });
  }
  await supabase.from("cleaner_applications").update({ cleaner_id: result.cleanerId }).eq("id", params.id);
  return NextResponse.json({ success: true, cleanerId: result.cleanerId });
}
