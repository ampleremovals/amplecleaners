/* eslint-disable @typescript-eslint/no-explicit-any -- untyped Supabase client */
import { createAdminClient } from "@/lib/supabase/server";
import { todayInLondon } from "@/lib/cleaner-auth";
import { PIPELINE_STAGES } from "@/lib/pipeline";

/** Everything the admin dashboard shows, loaded in one parallel round trip. All figures are real rows; nothing is estimated. */

import { RANGE_DAYS, londonDay, shiftDay, type RangeDays, type RevenueRange, type TeamMember, type TeamState } from "@/lib/admin/overview-shared";

const oneOf = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));

export async function loadOverview() {
  const db: any = createAdminClient();
  const today = todayInLondon();
  const monthStart = `${today.slice(0, 7)}-01`;
  const prevMonthStart = `${shiftDay(monthStart, -1).slice(0, 7)}-01`;
  const sixtyDaysAgo = shiftDay(today, -59);
  const fourteenAgo = shiftDay(today, -13);
  const weekEnd = shiftDay(today, 6);
  const count = (q: any) => q.then((r: any) => r.count ?? 0);
  const stageCounts = PIPELINE_STAGES.filter((s) => s.key !== "lost").map((s) => count(db.from("bookings").select("id", { count: "exact", head: true }).in("status", s.statuses)));

  const [cleaners, paid, unpaid, flagged, claimed, unassigned, enquiries, todays, applications, created, week, activity, ...stages] = await Promise.all([
    db.from("cleaners").select("id, full_name").eq("is_active", true).order("full_name"),
    db.from("invoices").select("total, paid_at").eq("status", "paid").gte("paid_at", `${sixtyDaysAgo < prevMonthStart ? sixtyDaysAgo : prevMonthStart}T00:00:00Z`),
    db.from("invoices").select("total, due_date").eq("status", "sent"),
    db.from("bookings").select("id, reference, flag_reason").eq("is_flagged", true).limit(5),
    count(db.from("bookings").select("id", { count: "exact", head: true }).eq("deposit_status", "claimed").in("status", ["quote_sent", "deposit_invoice_sent"])),
    count(db.from("bookings").select("id", { count: "exact", head: true }).eq("status", "booking_confirmed").is("assigned_cleaner_id", null)),
    count(db.from("bookings").select("id", { count: "exact", head: true }).eq("status", "inquiry")),
    db.from("bookings").select("id, reference, service_type, status, clean_time, assigned_cleaner_id, customer:customers(full_name), cleaner:cleaners(full_name)").eq("clean_date", today).not("status", "in", "(cancelled,bad_lead,not_a_good_fit)").order("clean_time"),
    count(db.from("cleaner_applications").select("id", { count: "exact", head: true }).eq("status", "new")),
    db.from("bookings").select("created_at").gte("created_at", `${fourteenAgo}T00:00:00Z`),
    db.from("bookings").select("clean_date").gte("clean_date", today).lte("clean_date", weekEnd).not("status", "in", "(cancelled,bad_lead,not_a_good_fit)"),
    db.from("activity_log").select("id, action, performed_by, created_at, booking:bookings(id, reference, customer:customers(full_name))").order("created_at", { ascending: false }).limit(8),
    ...stageCounts,
  ]);

  // ── Revenue: one query feeds 7/14/30-day views, each with the preceding period for comparison ──
  const paidRows: { total: number; paid_at: string }[] = paid.data ?? [];
  const byDay = new Map<string, number>();
  let thisMonth = 0;
  let lastMonth = 0;
  for (const r of paidRows) {
    const day = londonDay(r.paid_at);
    const amount = Number(r.total);
    byDay.set(day, (byDay.get(day) ?? 0) + amount);
    if (day >= monthStart) thisMonth += amount;
    else if (day >= prevMonthStart) lastMonth += amount;
  }
  const sumDays = (endOffset: number, n: number) => {
    let s = 0;
    for (let i = 0; i < n; i++) s += byDay.get(shiftDay(today, endOffset - i)) ?? 0;
    return s;
  };
  const ranges = Object.fromEntries(RANGE_DAYS.map((n) => [n, {
    series: Array.from({ length: n }, (_, i) => { const day = shiftDay(today, i - (n - 1)); return { day, amount: byDay.get(day) ?? 0 }; }),
    total: sumDays(0, n),
    previousTotal: sumDays(-n, n),
  } satisfies RevenueRange])) as Record<RangeDays, RevenueRange>;

  // ── Bookings received per day (last 14 days) ──
  const createdByDay = new Map<string, number>();
  for (const r of (created.data ?? []) as { created_at: string }[]) createdByDay.set(londonDay(r.created_at), (createdByDay.get(londonDay(r.created_at)) ?? 0) + 1);
  const bookingsSeries = Array.from({ length: 14 }, (_, i) => { const day = shiftDay(today, i - 13); return { day, count: createdByDay.get(day) ?? 0 }; });

  // ── Next 7 days of work ──
  const weekCounts = new Map<string, number>();
  for (const r of (week.data ?? []) as { clean_date: string }[]) weekCounts.set(r.clean_date, (weekCounts.get(r.clean_date) ?? 0) + 1);
  const weekLoad = Array.from({ length: 7 }, (_, i) => {
    const day = shiftDay(today, i);
    return { day, count: weekCounts.get(day) ?? 0 };
  });

  // ── Unpaid invoices ──
  const unpaidRows: { total: number; due_date: string | null }[] = unpaid.data ?? [];
  const overdueRows = unpaidRows.filter((i) => i.due_date && i.due_date < today);

  // ── Team today: who is on a job, who is booked, who is free ──
  const todayJobs: any[] = todays.data ?? [];
  const team: TeamMember[] = ((cleaners.data ?? []) as { id: string; full_name: string }[]).map((c) => {
    const mine = todayJobs.filter((j) => j.assigned_cleaner_id === c.id);
    const live = mine.find((j) => j.status === "in_progress");
    if (live) return { id: c.id, name: c.full_name, state: "on_job" as const, detail: "On a job now" };
    if (mine.length) return { id: c.id, name: c.full_name, state: "booked" as const, detail: `${mine.length} job${mine.length === 1 ? "" : "s"} today${mine[0].clean_time ? ` · from ${String(mine[0].clean_time).slice(0, 5)}` : ""}` };
    return { id: c.id, name: c.full_name, state: "available" as const, detail: "Available" };
  });
  const order: Record<TeamState, number> = { on_job: 0, booked: 1, available: 2 };
  team.sort((a, b) => order[a.state] - order[b.state] || a.name.localeCompare(b.name));

  return {
    today,
    revenue: { ranges, thisMonth, lastMonth },
    bookingsSeries,
    weekLoad,
    outstanding: {
      total: unpaidRows.reduce((s, i) => s + Number(i.total), 0),
      count: unpaidRows.length,
      overdueTotal: overdueRows.reduce((s, i) => s + Number(i.total), 0),
      overdueCount: overdueRows.length,
    },
    cleanersActive: (cleaners.data ?? []).length as number,
    team,
    unassigned: unassigned as number,
    todayJobs: todayJobs.map((j) => ({
      id: j.id as string, reference: j.reference as string, service_type: j.service_type as string, status: j.status as string,
      clean_time: (j.clean_time as string | null) ?? null,
      customer: oneOf<{ full_name: string }>(j.customer)?.full_name ?? "Customer",
      cleaner: oneOf<{ full_name: string }>(j.cleaner)?.full_name ?? null,
    })),
    inProgressToday: todayJobs.filter((j) => j.status === "in_progress").length,
    pipeline: PIPELINE_STAGES.filter((s) => s.key !== "lost").map((s, i) => ({ key: s.key, title: s.title, count: stages[i] as number })),
    activity: ((activity.data ?? []) as any[]).map((a) => {
      const booking = oneOf<any>(a.booking);
      return {
        id: a.id as string, action: a.action as string, by: a.performed_by as string, at: a.created_at as string,
        bookingId: (booking?.id as string | undefined) ?? null, reference: (booking?.reference as string | undefined) ?? null,
        customer: oneOf<{ full_name: string }>(booking?.customer)?.full_name ?? null,
      };
    }),
    attention: {
      flagged: (flagged.data ?? []) as { id: string; reference: string; flag_reason: string | null }[],
      claimed: claimed as number, unassigned: unassigned as number, enquiries: enquiries as number, applications: applications as number,
      overdueCount: overdueRows.length, overdueTotal: overdueRows.reduce((s, i) => s + Number(i.total), 0),
    },
  };
}
export type Overview = Awaited<ReturnType<typeof loadOverview>>;
