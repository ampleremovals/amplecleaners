import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/server";
import { z } from "zod";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("cleaners")
    .select("id, full_name, email, phone, is_active, dbs_verified, rating_avg, pay_rate_per_hour, created_at")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, cleaners: data ?? [] });
}

const createSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(8),
  payRatePerHour: z.number().positive().optional(),
});

/**
 * POST /api/admin/cleaners — add a cleaner to the roster. Does NOT create a
 * Supabase Auth user yet (that needs an invite-email flow, Phase 3) — this
 * just creates the roster record the admin can assign jobs to; the cleaner
 * mobile app login is wired up once auth invites are built.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("cleaners")
    .insert({
      full_name: parsed.data.fullName,
      email: parsed.data.email,
      phone: parsed.data.phone,
      pay_rate_per_hour: parsed.data.payRatePerHour ?? null,
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, id: data.id });
}
