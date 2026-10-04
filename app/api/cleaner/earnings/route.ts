/* eslint-disable @typescript-eslint/no-explicit-any -- untyped Supabase client */
import { NextResponse } from "next/server";
import { requireCleaner, todayInLondon } from "@/lib/cleaner-auth";
import { createAdminClient } from "@/lib/supabase/server";
import { computeEarnings } from "@/lib/earnings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/cleaner/earnings — what this cleaner has EARNED from completed,
 * clocked jobs (clocked hours × their pay rate). Computed server-side so the
 * app never needs read access to the cleaner's pay rate or bank columns beyond
 * its own row. This is earnings, not a payout ledger: payroll runs outside the
 * app, so there's deliberately no "paid" state to claim.
 */
export async function GET() {
  const auth = await requireCleaner();
  if (!auth.ok) return auth.response;

  const supabase: any = createAdminClient();
  const [{ data: cleaner }, { data: jobs }] = await Promise.all([
    supabase.from("cleaners").select("pay_rate_per_hour").eq("id", auth.session.cleanerId).single(),
    supabase
      .from("bookings")
      .select("id, reference, service_type, clean_date, clock_in_at, clock_out_at")
      .eq("assigned_cleaner_id", auth.session.cleanerId)
      .not("clock_in_at", "is", null)
      .not("clock_out_at", "is", null)
      .order("clock_out_at", { ascending: false })
      .limit(200),
  ]);

  const rate = cleaner?.pay_rate_per_hour == null ? null : Number(cleaner.pay_rate_per_hour);
  return NextResponse.json({ success: true, ...computeEarnings(jobs ?? [], rate, todayInLondon()) });
}
