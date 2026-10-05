"use client";

import { useState } from "react";
import { BarChart3 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAdminFetch } from "@/hooks/useAdminFetch";
import { ErrorState, EmptyState } from "@/components/admin/DataState";
import { MarketingReport } from "@/components/admin/MarketingReport";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/utils";

interface ReportResponse {
  success: boolean; error?: string;
  range: { from: string; to: string; days: number };
  revenue: { total: number; outstanding: number; overdue: number; byWeek: { week: string; amount: number }[] };
  bookings: { total: number; avgQuote: number; byService: { service: string; count: number }[]; bySource: { source: string; count: number }[] };
  funnel: { stage: string; count: number }[];
  cleaners: { id: string; name: string; jobs: number; hours: number }[];
}

const RANGES = [{ days: 30, label: "30 days" }, { days: 90, label: "90 days" }, { days: 365, label: "12 months" }];
const GREEN = "#16a34a";
const SKY = "#0ea5e9";
const VIOLET = "#8b5cf6";
const FUNNEL_COLOURS = [SKY, "#38bdf8", "#4ade80", GREEN, "#15803d"];

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="font-bold text-slate-900">{title}</h2>
      {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Stat({ label, value, tone = "text-slate-900" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 font-display text-2xl font-extrabold tabular-nums ${tone}`}>{value}</p>
    </div>
  );
}

const tooltipStyle = { borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 };

export default function ReportsPage() {
  const [days, setDays] = useState(90);
  const { data, loading, error, reload } = useAdminFetch<ReportResponse>(`/api/admin/reports?days=${days}`);

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-slate-900">Reports</h1>
          {data && <p className="mt-1 text-sm text-slate-500">{formatDate(data.range.from)} – {formatDate(data.range.to)}</p>}
        </div>
        <div className="flex rounded-xl bg-slate-100 p-1">
          {RANGES.map((r) => (
            <button key={r.days} onClick={() => setDays(r.days)} className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-colors ${days === r.days ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>{r.label}</button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        {error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : loading && !data ? (
          <div className="space-y-4" aria-busy="true" aria-label="Loading">
            <div className="grid gap-3 sm:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
            <Skeleton className="h-72 rounded-2xl" />
            <div className="grid gap-4 lg:grid-cols-2"><Skeleton className="h-64 rounded-2xl" /><Skeleton className="h-64 rounded-2xl" /></div>
          </div>
        ) : data && data.bookings.total === 0 && data.revenue.total === 0 ? (
          <EmptyState icon={<BarChart3 className="h-8 w-8" />} title="Nothing to report yet" hint="Charts fill in as bookings and payments come through." />
        ) : data ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Revenue (paid)" value={formatCurrency(data.revenue.total)} tone="text-brand-green-800" />
              <Stat label="Bookings" value={String(data.bookings.total)} />
              <Stat label="Avg quote" value={formatCurrency(data.bookings.avgQuote)} />
              <Stat label="Outstanding" value={formatCurrency(data.revenue.outstanding)} tone={data.revenue.overdue > 0 ? "text-red-700" : "text-amber-700"} />
            </div>

            <Card title="Revenue by week" subtitle="Money actually received (paid invoices)">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.revenue.byWeek} margin={{ left: -10, right: 8, top: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="week" tickFormatter={(w: string) => formatDate(w).slice(0, 5)} tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                    <YAxis tickFormatter={(v: number) => `£${v}`} tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={tooltipStyle} labelFormatter={(w) => `Week of ${formatDate(String(w))}`} formatter={(v) => [formatCurrency(Number(v)), "Revenue"]} />
                    <Bar dataKey="amount" fill={GREEN} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card title="Booking funnel" subtitle="How many of this period's enquiries reached each stage">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.funnel} layout="vertical" margin={{ left: 8, right: 24 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="stage" width={80} tick={{ fontSize: 12 }} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v) => [String(v), "Bookings"]} />
                      <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                        {data.funnel.map((_, i) => <Cell key={i} fill={FUNNEL_COLOURS[i % FUNNEL_COLOURS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card title="Bookings by service">
                {data.bookings.byService.length === 0 ? <p className="py-10 text-center text-sm text-slate-400">No bookings in this period.</p> : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.bookings.byService} layout="vertical" margin={{ left: 8, right: 24 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                        <YAxis type="category" dataKey="service" width={130} tick={{ fontSize: 11 }} />
                        <Tooltip contentStyle={tooltipStyle} formatter={(v) => [String(v), "Bookings"]} />
                        <Bar dataKey="count" fill={VIOLET} radius={[0, 6, 6, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card title="Cleaner hours" subtitle="Clocked hours on completed jobs">
                {data.cleaners.length === 0 ? <p className="py-6 text-center text-sm text-slate-400">No clocked jobs in this period.</p> : (
                  <ul className="divide-y divide-slate-100">
                    {data.cleaners.map((c) => (
                      <li key={c.id} className="flex items-center justify-between py-2.5 text-sm">
                        <span className="font-semibold text-slate-800">{c.name}</span>
                        <span className="text-slate-500">{c.jobs} job{c.jobs === 1 ? "" : "s"} · <strong className="text-slate-800">{c.hours}h</strong></span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
              <Card title="Where bookings come from">
                {data.bookings.bySource.length === 0 ? <p className="py-6 text-center text-sm text-slate-400">No bookings in this period.</p> : (
                  <ul className="divide-y divide-slate-100">
                    {data.bookings.bySource.map((s) => (
                      <li key={s.source} className="flex items-center justify-between py-2.5 text-sm">
                        <span className="font-semibold capitalize text-slate-800">{s.source.replace(/_/g, " ")}</span>
                        <span className="font-semibold tabular-nums text-slate-600">{s.count}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          </div>
        ) : null}
      </div>

      <MarketingReport days={days} />
    </div>
  );
}
