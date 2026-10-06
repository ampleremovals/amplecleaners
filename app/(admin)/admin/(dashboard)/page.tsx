/* eslint-disable @typescript-eslint/no-explicit-any -- untyped Supabase client */
import Link from "next/link";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, CheckCircle2, ChevronRight, Inbox, Landmark, Receipt, UserPlus, UserX } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/server";
import { todayInLondon } from "@/lib/cleaner-auth";
import { ErrorState } from "@/components/admin/DataState";
import { Avatar, PageHeader, Panel, PanelHeader, StatusBadge } from "@/components/admin/ui";
import { formatCurrency } from "@/lib/utils";
import { PIPELINE_STAGES } from "@/lib/pipeline";
import { SERVICE_LABELS, type BookingStatus, type ServiceType } from "@/types";

export const dynamic = "force-dynamic";

const oneOf = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));
const CHART_DAYS = 14;

/** YYYY-MM-DD shifted by whole days (pure calendar arithmetic, no timezone involved). */
function shiftDay(ymd: string, days: number): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
const londonDay = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: "Europe/London" });
const shortDay = (ymd: string) => new Date(`${ymd}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

async function loadOverview() {
  const db: any = createAdminClient();
  const today = todayInLondon();
  const monthStart = `${today.slice(0, 7)}-01`;
  const prevMonthStart = shiftDay(monthStart, -1).slice(0, 7) + "-01";
  const count = (q: any) => q.then((r: any) => r.count ?? 0);
  const stageCounts = PIPELINE_STAGES.filter((s) => s.key !== "lost").map((s) => count(db.from("bookings").select("id", { count: "exact", head: true }).in("status", s.statuses)));

  const [cleaners, paid, unpaid, flagged, claimed, unassigned, enquiries, todays, applications, ...stages] = await Promise.all([
    count(db.from("cleaners").select("id", { count: "exact", head: true }).eq("is_active", true)),
    db.from("invoices").select("total, paid_at").eq("status", "paid").gte("paid_at", `${prevMonthStart}T00:00:00Z`),
    db.from("invoices").select("total, due_date").eq("status", "sent"),
    db.from("bookings").select("id, reference, flag_reason").eq("is_flagged", true).limit(5),
    count(db.from("bookings").select("id", { count: "exact", head: true }).eq("deposit_status", "claimed").in("status", ["quote_sent", "deposit_invoice_sent"])),
    count(db.from("bookings").select("id", { count: "exact", head: true }).eq("status", "booking_confirmed").is("assigned_cleaner_id", null)),
    count(db.from("bookings").select("id", { count: "exact", head: true }).eq("status", "inquiry")),
    db.from("bookings").select("id, reference, service_type, status, clean_time, customer:customers(full_name), cleaner:cleaners(full_name)").eq("clean_date", today).not("status", "in", "(cancelled,bad_lead,not_a_good_fit)").order("clean_time"),
    count(db.from("cleaner_applications").select("id", { count: "exact", head: true }).eq("status", "new")),
    ...stageCounts,
  ]);

  // Revenue: this month, last month, and a per-day series for the chart (all from one query).
  const paidRows: { total: number; paid_at: string }[] = paid.data ?? [];
  const byDay = new Map<string, number>();
  let thisMonth = 0;
  let lastMonth = 0;
  for (const r of paidRows) {
    const day = londonDay(r.paid_at);
    const amount = Number(r.total);
    byDay.set(day, (byDay.get(day) ?? 0) + amount);
    if (day >= monthStart) thisMonth += amount;
    else lastMonth += amount;
  }
  const series = Array.from({ length: CHART_DAYS }, (_, i) => {
    const day = shiftDay(today, i - (CHART_DAYS - 1));
    return { day, amount: byDay.get(day) ?? 0 };
  });

  const unpaidRows: { total: number; due_date: string | null }[] = unpaid.data ?? [];
  const overdueRows = unpaidRows.filter((i) => i.due_date && i.due_date < today);
  const todayJobs: any[] = todays.data ?? [];

  return {
    today,
    revenue: { thisMonth, lastMonth, series, fortnight: series.reduce((s, d) => s + d.amount, 0) },
    outstanding: {
      total: unpaidRows.reduce((s, i) => s + Number(i.total), 0),
      count: unpaidRows.length,
      overdueTotal: overdueRows.reduce((s, i) => s + Number(i.total), 0),
      overdueCount: overdueRows.length,
    },
    cleaners, unassigned,
    todayJobs,
    inProgressToday: todayJobs.filter((j) => j.status === "in_progress").length,
    pipeline: PIPELINE_STAGES.filter((s) => s.key !== "lost").map((s, i) => ({ key: s.key, title: s.title, count: stages[i] as number })),
    attention: { flagged: flagged.data ?? [], claimed, unassigned, enquiries, applications, overdueCount: overdueRows.length, overdueTotal: overdueRows.reduce((s, i) => s + Number(i.total), 0) },
  };
}
type Overview = Awaited<ReturnType<typeof loadOverview>>;

/* ── Pieces ─────────────────────────────────────────────────────────────── */

function Delta({ now, before }: { now: number; before: number }) {
  if (before <= 0) return <span className="text-xs text-slate-500">{now > 0 ? "First revenue to compare against" : "No revenue yet"}</span>;
  const pct = Math.round(((now - before) / before) * 100);
  const up = pct >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className="flex items-center gap-1.5 text-xs text-slate-500">
      <span className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-semibold ${up ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
        <Icon className="h-3 w-3" />{Math.abs(pct)}%
      </span>
      vs last month
    </span>
  );
}

function Kpi({ label, value, footer }: { label: string; value: string; footer: React.ReactNode }) {
  return (
    <Panel className="p-4 sm:p-5">
      <p className="text-[13px] font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-[1.5rem] font-semibold leading-none tracking-tight text-slate-900 sm:text-[1.9rem]">{value}</p>
      <div className="mt-3 min-h-[1.25rem]">{footer}</div>
    </Panel>
  );
}

/** 14 daily bars. Plain HTML so it is crisp, responsive and needs no chart library. */
function RevenueChart({ series }: { series: Overview["revenue"]["series"] }) {
  const max = Math.max(...series.map((d) => d.amount), 0);
  const empty = max === 0;
  const top = empty ? 100 : Math.ceil(max / 10) * 10;
  return (
    <div className="px-5 pb-5 pt-7">
      <div className="relative h-52">
        {[0, 0.5, 1].map((f) => (
          <div key={f} className="absolute inset-x-0 flex items-center" style={{ bottom: `${f * 100}%` }}>
            <span className="w-10 shrink-0 -translate-y-1/2 pr-2 text-right text-[11px] text-slate-400">{formatCurrency(top * f).replace(/\.00$/, "")}</span>
            <span className="h-px flex-1 bg-slate-100" />
          </div>
        ))}
        <div className="absolute inset-y-0 left-10 right-0 flex items-end gap-1.5">
          {series.map((d, i) => {
            const isToday = i === series.length - 1;
            return (
              <div key={d.day} className="group relative flex h-full flex-1 items-end" title={`${shortDay(d.day)} · ${formatCurrency(d.amount)}`}>
                <div
                  className={`w-full rounded-t-[5px] transition-colors ${d.amount === 0 ? "bg-slate-100" : isToday ? "bg-brand-green-700" : "bg-brand-green-500/80 group-hover:bg-brand-green-600"}`}
                  style={{ height: d.amount === 0 ? "3px" : `${Math.max((d.amount / top) * 100, 3)}%` }}
                />
              </div>
            );
          })}
        </div>
      </div>
      <div className="ml-10 mt-2 flex justify-between text-[11px] text-slate-400">
        <span>{shortDay(series[0].day)}</span>
        <span>{shortDay(series[Math.floor(series.length / 2)].day)}</span>
        <span>Today</span>
      </div>
      {empty && <p className="mt-3 text-center text-xs text-slate-500">No payments received in this period.</p>}
    </div>
  );
}

const STAGE_COLOR: Record<string, string> = { new: "bg-slate-400", quoted: "bg-sky-500", confirmed: "bg-emerald-500", in_progress: "bg-amber-500", completed: "bg-slate-800" };

function Pipeline({ stages }: { stages: Overview["pipeline"] }) {
  const total = stages.reduce((s, x) => s + x.count, 0);
  return (
    <Panel>
      <PanelHeader title="Pipeline" hint={`${total} active booking${total === 1 ? "" : "s"}`} right={<Link href="/admin/bookings" className="text-xs font-medium text-brand-green-700 hover:underline">Open board</Link>} />
      <div className="p-5">
        <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100" role="img" aria-label="Bookings by pipeline stage">
          {total > 0 && stages.filter((s) => s.count > 0).map((s) => (
            <span key={s.key} className={STAGE_COLOR[s.key]} style={{ width: `${(s.count / total) * 100}%` }} />
          ))}
        </div>
        <ul className="mt-5 divide-y divide-slate-100">
          {stages.map((s) => (
            <li key={s.key} className="flex items-center justify-between py-2.5 text-sm">
              <span className="flex items-center gap-2.5 text-slate-700"><span className={`h-2 w-2 rounded-full ${STAGE_COLOR[s.key]}`} aria-hidden />{s.title}</span>
              <span className="font-semibold text-slate-900">{s.count}</span>
            </li>
          ))}
        </ul>
      </div>
    </Panel>
  );
}

type Severity = "info" | "warning" | "critical";
const DOT: Record<Severity, string> = { info: "bg-sky-500", warning: "bg-amber-500", critical: "bg-red-500" };

function AttentionRow({ href, icon: Icon, severity, title, hint }: { href: string; icon: typeof Inbox; severity: Severity; title: string; hint: string }) {
  return (
    <li>
      <Link href={href} className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-slate-50">
        <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
          <Icon className="h-4 w-4" />
          <span className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-white ${DOT[severity]}`} aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-slate-900">{title}</span>
          <span className="block truncate text-xs text-slate-500">{hint}</span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition-colors group-hover:text-slate-500" />
      </Link>
    </li>
  );
}

function Attention({ a }: { a: Overview["attention"] }) {
  const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);
  const rows: React.ReactNode[] = [];
  if (a.enquiries) rows.push(<AttentionRow key="enq" href="/admin/bookings" icon={Inbox} severity="info" title={`${a.enquiries} new ${plural(a.enquiries, "enquiry", "enquiries")}`} hint="Build and send a quote" />);
  if (a.applications) rows.push(<AttentionRow key="app" href="/admin/applications" icon={UserPlus} severity="info" title={`${a.applications} cleaner ${plural(a.applications, "application", "applications")} to review`} hint="Approve or decline" />);
  if (a.claimed) rows.push(<AttentionRow key="dep" href="/admin/bookings" icon={Landmark} severity="warning" title={`${a.claimed} ${plural(a.claimed, "deposit", "deposits")} to verify`} hint="Customer says they've paid by bank transfer" />);
  if (a.unassigned) rows.push(<AttentionRow key="una" href="/admin/bookings" icon={UserX} severity="warning" title={`${a.unassigned} confirmed ${plural(a.unassigned, "job", "jobs")} without a cleaner`} hint="Open it and press Auto-assign" />);
  if (a.overdueCount) rows.push(<AttentionRow key="od" href="/admin/invoices" icon={Receipt} severity="critical" title={`${a.overdueCount} overdue ${plural(a.overdueCount, "invoice", "invoices")}`} hint={`${formatCurrency(a.overdueTotal)} outstanding`} />);
  for (const b of a.flagged) rows.push(<AttentionRow key={b.id} href={`/admin/bookings/${b.id}`} icon={AlertTriangle} severity="critical" title={`${b.reference} needs attention`} hint={b.flag_reason ?? "Flagged"} />);

  return (
    <Panel>
      <PanelHeader
        title="Needs your attention"
        right={rows.length > 0 ? <span className="rounded-full bg-slate-900 px-2 py-0.5 text-xs font-semibold text-white">{rows.length}</span> : undefined}
      />
      {rows.length ? (
        <ul className="divide-y divide-slate-100">{rows}</ul>
      ) : (
        <div className="flex items-center gap-3 px-5 py-6 text-sm text-slate-600">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" /> All clear. Nothing is waiting on you.
        </div>
      )}
    </Panel>
  );
}

function TodaysJobs({ jobs }: { jobs: any[] }) {
  return (
    <Panel>
      <PanelHeader title="Today's jobs" hint={`${jobs.length} scheduled`} right={<Link href="/admin/bookings" className="text-xs font-medium text-brand-green-700 hover:underline">All bookings</Link>} />
      {jobs.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-slate-500">No jobs scheduled for today.</p>
      ) : (
        <>
          <div className="hidden grid-cols-[4rem_1.5fr_1fr_9.5rem] gap-4 border-b border-slate-100 px-5 py-2 text-xs font-medium text-slate-400 md:grid">
            <span>Time</span><span>Customer</span><span>Cleaner</span><span className="text-right">Status</span>
          </div>
          <ul className="divide-y divide-slate-100">
            {jobs.map((j) => {
              const customer = oneOf<{ full_name: string }>(j.customer);
              const cleaner = oneOf<{ full_name: string }>(j.cleaner);
              return (
                <li key={j.id}>
                  <Link href={`/admin/bookings/${j.id}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-5 py-3 transition-colors hover:bg-slate-50 md:grid-cols-[4rem_1.5fr_1fr_9.5rem]">
                    <span className="hidden text-sm font-medium text-slate-900 md:block">{j.clean_time ? String(j.clean_time).slice(0, 5) : "TBC"}</span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-slate-900">{customer?.full_name ?? "Customer"}</span>
                      <span className="block truncate text-xs text-slate-500">
                        <span className="md:hidden">{j.clean_time ? String(j.clean_time).slice(0, 5) : "TBC"} · </span>{SERVICE_LABELS[j.service_type as ServiceType]}
                      </span>
                    </span>
                    <span className="order-last col-span-2 flex items-center gap-2 text-sm md:order-none md:col-span-1">
                      {cleaner ? <><Avatar name={cleaner.full_name} size={24} /><span className="truncate text-slate-700">{cleaner.full_name}</span></> : <span className="text-amber-700">Unassigned</span>}
                    </span>
                    <span className="justify-self-end"><StatusBadge status={j.status as BookingStatus} /></span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Panel>
  );
}

/* ── Page ───────────────────────────────────────────────────────────────── */

export default async function AdminDashboardPage() {
  let data: Overview | null = null;
  try {
    data = await loadOverview();
  } catch {
    data = null;
  }
  if (!data) {
    return <div className="p-4 sm:p-8"><ErrorState message="We couldn't load the overview. Refresh the page to try again." /></div>;
  }
  const { revenue, outstanding } = data;
  const dayLabel = new Date(`${data.today}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6 px-4 py-6 sm:px-8 sm:py-8">
      <PageHeader title="Overview" description={dayLabel} />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Kpi label="Revenue this month" value={formatCurrency(revenue.thisMonth)} footer={<Delta now={revenue.thisMonth} before={revenue.lastMonth} />} />
        <Kpi
          label="Outstanding invoices"
          value={formatCurrency(outstanding.total)}
          footer={
            outstanding.overdueCount > 0
              ? <span className="text-xs font-medium text-red-700">{formatCurrency(outstanding.overdueTotal)} overdue ({outstanding.overdueCount})</span>
              : <span className="text-xs text-slate-500">{outstanding.count === 0 ? "Nothing unpaid" : `${outstanding.count} unpaid, none overdue`}</span>
          }
        />
        <Kpi label="Jobs today" value={String(data.todayJobs.length)} footer={<span className="text-xs text-slate-500">{data.inProgressToday} in progress now</span>} />
        <Kpi
          label="Active cleaners"
          value={String(data.cleaners)}
          footer={data.unassigned > 0 ? <span className="text-xs font-medium text-amber-700">{data.unassigned} confirmed {data.unassigned === 1 ? "job needs" : "jobs need"} a cleaner</span> : <span className="text-xs text-slate-500">All confirmed jobs covered</span>}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Panel className="min-w-0 xl:col-span-2">
          <PanelHeader
            title="Revenue received"
            hint="Last 14 days, by payment date"
            right={<span className="text-lg font-semibold tracking-tight text-slate-900">{formatCurrency(revenue.fortnight)}</span>}
          />
          <RevenueChart series={revenue.series} />
        </Panel>
        <Pipeline stages={data.pipeline} />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="min-w-0 xl:col-span-2"><TodaysJobs jobs={data.todayJobs} /></div>
        <Attention a={data.attention} />
      </div>
    </div>
  );
}
