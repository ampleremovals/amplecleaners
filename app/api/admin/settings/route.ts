import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/server";
import { clearPricingCache } from "@/lib/pricing-config";

export const dynamic = "force-dynamic";

const COLUMNS = "company_name, company_address, company_phone, company_email, google_review_link, customer_sms_enabled, customer_whatsapp_enabled, hourly_rate, min_hours, deposit_percentage";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { data, error } = await createAdminClient().from("settings").select(COLUMNS).eq("id", 1).maybeSingle();
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, settings: data });
}

const optionalText = (max: number) => z.string().trim().max(max).transform((v) => v || null).nullable().optional();
const patchSchema = z.object({
  company_name: z.string().trim().min(1).max(100).optional(),
  company_address: optionalText(300),
  company_phone: optionalText(30),
  company_email: z.string().trim().email().max(200).or(z.literal("")).transform((v) => v || null).nullable().optional(),
  google_review_link: z.string().trim().url().max(500).or(z.literal("")).transform((v) => v || null).nullable().optional(),
  customer_sms_enabled: z.boolean().optional(),
  customer_whatsapp_enabled: z.boolean().optional(),
  hourly_rate: z.number().min(5).max(200).optional(),
  min_hours: z.number().min(1).max(12).optional(),
  deposit_percentage: z.number().min(5).max(100).optional(),
});

/** PATCH — update business details and messaging switches (singleton row id=1). */
export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message ?? "Invalid settings" }, { status: 400 });

  const { error } = await createAdminClient().from("settings").update(parsed.data).eq("id", 1);
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  clearPricingCache();
  return NextResponse.json({ success: true });
}
