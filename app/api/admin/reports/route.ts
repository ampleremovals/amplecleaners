/* eslint-disable @typescript-eslint/no-explicit-any -- untyped Supabase client */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/server";
import { todayInLondon } from "@/lib/cleaner-auth";
import { startOfWeek, hoursWorked } from "@/lib/earnings";
import { SERVICE_LABELS, type ServiceType } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FUNNEL: { stage: string; status: string }[] = [
  { stage: "Enquiries", status: "inquiry" },
  { stage: "Quoted", status: "quote_sent" },
  { stage: "Confirmed", status: "booking_confirmed" },
  { stage: "Completed", status: "job_completed" },
  { stage: "Paid", status: "paid" },
];

const chunk = <T,>(arr: T[], n: number): T[][] => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));

/** GET /api/admin/reports?days=90 — everything the Reports page charts, aggregated server-side. */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const days = Math.min(365, Math.max(7, Number(new URL(req.url).searchParams.get("days")) || 90));
  const today = todayInLondon();
  const from = new Date(new Date(`${today}T00:00:00Z`).getTime() - days * 86_400_000).toISOString().slice(0, 10);

  const supabase: any = createAdminClient();
  const [{ data: paid }, { data: open }, { data: bookings }, { data: worked }] = await Promise.all([
    supabase.from("invoices").select("total, paid_at, type").eq("status", "paid").gte("paid_at", `${from}T00:00:00Z`),
    supabase.from("invoices").select("total, due_date").eq("status", "sent"),
    supabase.from("bookings").select("id, service_type, source, created_at, quote_total").gte("created_at", `${from}T00:00:00Z`),
    supabase.from("bookings").select("assigned_cleaner_id, clock_in_at, clock_out_at, cleaner:cleaners(full_name)").gte("clock_out_at", `${from}T00:00:00Z`).not("clock_in_at", "is", null).not("clock_out_at", "is", null),
  ]);

  // Revenue by week (Monday-start), zero-filled so the chart has no gaps.
  const weekly = new Map<string, number>();
  for (let d = startOfWeek(from); d <= today; d = new Date(new Date(`${d}T00:00:00Z`).getTime() + 7 * 86_400_000).toISOString().slice(0, 10)) weekly.set(d, 0);
  let revenue = 0;
  for (const i of paid ?? []) {
    const wk = startOfWeek(String(i.paid_at).slice(0, 10));
    weekly.set(wk, (weekly.get(wk) ?? 0) + Number(i.total));
    revenue += Number(i.total);
  }

  const byService = new Map<string, number>();
  const bySource = new Map<string, number>();
  for (const b of bookings ?? []) {
    byService.set(b.service_type, (byService.get(b.service_type) ?? 0) + 1);
    bySource.set(b.source ?? "unknown", (bySource.get(b.source ?? "unknown") ?? 0) + 1);
  }

  // Funnel: how many of this period's bookings EVER reached each stage (status_history, not just current status).
  const ids: string[] = (bookings ?? []).map((b: any) => b.id);
  const reached = new Map<string, Set<string>>(FUNNEL.map((f) => [f.status, new Set<string>()]));
  for (const part of chunk(ids, 200)) {
    const { data: hist } = await supabase.from("status_history").select("booking_id, new_status").in("booking_id", part).in("new_status", FUNNEL.map((f) => f.status));
    for (const h of hist ?? []) reached.get(h.new_status)?.add(h.booking_id);
  }
  const funnel = FUNNEL.map((f) => ({ stage: f.stage, count: f.status === "inquiry" ? ids.length : reached.get(f.status)!.size }));

  const cleaners = new Map<string, { name: string; jobs: number; hours: number }>();
  for (const j of worked ?? []) {
    const cleaner = Array.isArray(j.cleaner) ? j.cleaner[0] : j.cleaner;
    const row = cleaners.get(j.assigned_cleaner_id) ?? { name: cleaner?.full_name ?? "Unknown", jobs: 0, hours: 0 };
    row.jobs++;
    row.hours += hoursWorked(j.clock_in_at, j.clock_out_at);
    cleaners.set(j.assigned_cleaner_id, row);
  }

  const quoted = (bookings ?? []).filter((b: any) => Number(b.quote_total) > 0);
  const outstanding = (open ?? []).reduce((s: number, i: any) => s + Number(i.total), 0);
  const overdue = (open ?? []).filter((i: any) => i.due_date && i.due_date < today).reduce((s: number, i: any) => s + Number(i.total), 0);

  return NextResponse.json({
    success: true,
    range: { from, to: today, days },
    revenue: { total: Math.round(revenue * 100) / 100, outstanding, overdue, byWeek: [...weekly].map(([week, amount]) => ({ week, amount: Math.round(amount * 100) / 100 })) },
    bookings: {
      total: ids.length,
      avgQuote: quoted.length ? Math.round((quoted.reduce((s: number, b: any) => s + Number(b.quote_total), 0) / quoted.length) * 100) / 100 : 0,
      byService: [...byService].map(([service, count]) => ({ service: SERVICE_LABELS[service as ServiceType] ?? service, count })).sort((a, b) => b.count - a.count),
      bySource: [...bySource].map(([source, count]) => ({ source, count })).sort((a, b) => b.count - a.count),
    },
    funnel,
    cleaners: [...cleaners].map(([id, c]) => ({ id, name: c.name, jobs: c.jobs, hours: Math.round(c.hours * 10) / 10 })).sort((a, b) => b.hours - a.hours),
  });
}
