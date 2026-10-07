"use client";

import { useState } from "react";
import { BarChart3 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAdminFetch } from "@/hooks/useAdminFetch";
import { ErrorState, EmptyState } from "@/components/admin/DataState";
import { Segmented } from "@/components/admin/controls";
import { AdminHero, AdminPage } from "@/components/admin/kit";
import { MarketingReport } from "@/components/admin/MarketingReport";
import { Avatar, Panel, PanelHeader } from "@/components/admin/ui";
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

const RANGES = [{ key: 30, label: "30 days" }, { key: 90, label: "90 days" }, { key: 365, label: "12 months" }];
const GREEN = "#16a34a";
const VIOLET = "#8b5cf6";
const FUNNEL_COLOURS = ["#38bdf8", "#0ea5e9", "#4ade80", GREEN, "#15803d"];
const tooltipStyle = { borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12, boxShadow: "0 10px 30px -12px rgba(15,23,42,0.25)" };
const AXIS = { fontSize: 11, fill: "#64748b" };

function ChartCard({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <Panel>
      <PanelHeader title={title} hint={hint} />
      <div className="p-5">{children}</div>
    </Panel>
  );
}

export default function ReportsPage() {
  const [days, setDays] = useState(90);
  const { data, loading, error, reload } = useAdminFetch<ReportResponse>(`/api/admin/reports?days=${days}`);

  return (
    <AdminPage>
      <AdminHero
        eyebrow="Finance"
        title="Reports"
        description={data ? `${formatDate(data.range.from)} to ${formatDate(data.range.to)}` : "Revenue, bookings and where they come from."}
        actions={<Segmented tone="dark" label="Report range" value={days} onChange={setDays} options={RANGES} />}
        stats={data ? [
          { label: "Revenue (paid)", value: formatCurrency(data.revenue.total), hint: "Money actually received" },
          { label: "Bookings", value: data.bookings.total, hint: "Created in this period" },
          { label: "Average quote", value: formatCurrency(data.bookings.avgQuote) },
          { label: "Outstanding", value: formatCurrency(data.revenue.outstanding), hint: data.revenue.overdue > 0 ? `${formatCurrency(data.revenue.overdue)} overdue` : "None overdue", tone: data.revenue.overdue > 0 ? "critical" : "default" },
        ] : undefined}
      />

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : loading && !data ? (
        <div className="space-y-4" aria-busy="true" aria-label="Loading">
          <Skeleton className="h-72 rounded-xl" />
          <div className="grid gap-4 lg:grid-cols-2"><Skeleton className="h-64 rounded-xl" /><Skeleton className="h-64 rounded-xl" /></div>
        </div>
      ) : data && data.bookings.total === 0 && data.revenue.total === 0 ? (
        <EmptyState icon={<BarChart3 className="h-8 w-8" />} title="Nothing to report yet" hint="Charts fill in as bookings and payments come through." />
      ) : data ? (
        <div className="space-y-6">
          <ChartCard title="Revenue by week" hint="Money actually received (paid invoices)">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.revenue.byWeek} margin={{ left: -10, right: 8, top: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="week" tickFormatter={(w: string) => formatDate(w).slice(0, 5)} tick={AXIS} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis tickFormatter={(v: number) => `£${v}`} tick={AXIS} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: "rgba(22,163,74,0.06)" }} contentStyle={tooltipStyle} labelFormatter={(w) => `Week of ${formatDate(String(w))}`} formatter={(v) => [formatCurrency(Number(v)), "Revenue"]} />
                  <Bar dataKey="amount" fill={GREEN} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard title="Booking funnel" hint="How many of this period's enquiries reached each stage">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.funnel} layout="vertical" margin={{ left: 8, right: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" allowDecimals={false} tick={AXIS} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="stage" width={84} tick={{ ...AXIS, fontSize: 12 }} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{ fill: "rgba(14,165,233,0.06)" }} contentStyle={tooltipStyle} formatter={(v) => [String(v), "Bookings"]} />
                    <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                      {data.funnel.map((_, i) => <Cell key={i} fill={FUNNEL_COLOURS[i % FUNNEL_COLOURS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Bookings by service">
              {data.bookings.byService.length === 0 ? <p className="py-10 text-center text-sm text-slate-500">No bookings in this period.</p> : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.bookings.byService} layout="vertical" margin={{ left: 8, right: 24 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                      <XAxis type="number" allowDecimals={false} tick={AXIS} tickLine={false} axisLine={false} />
                      <YAxis type="category" dataKey="service" width={130} tick={AXIS} tickLine={false} axisLine={false} />
                      <Tooltip cursor={{ fill: "rgba(139,92,246,0.06)" }} contentStyle={tooltipStyle} formatter={(v) => [String(v), "Bookings"]} />
                      <Bar dataKey="count" fill={VIOLET} radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartCard>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Panel>
              <PanelHeader title="Cleaner hours" hint="Clocked hours on completed jobs" />
              {data.cleaners.length === 0 ? <p className="px-5 py-8 text-center text-sm text-slate-500">No clocked jobs in this period.</p> : (
                <ul className="divide-y divide-slate-100">
                  {data.cleaners.map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                      <span className="flex items-center gap-3 font-medium text-slate-900"><Avatar name={c.name} size={30} />{c.name}</span>
                      <span className="text-slate-500">{c.jobs} job{c.jobs === 1 ? "" : "s"} · <strong className="font-semibold text-slate-900">{c.hours}h</strong></span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
            <Panel>
              <PanelHeader title="Where bookings come from" />
              {data.bookings.bySource.length === 0 ? <p className="px-5 py-8 text-center text-sm text-slate-500">No bookings in this period.</p> : (
                <ul className="divide-y divide-slate-100">
                  {data.bookings.bySource.map((s) => (
                    <li key={s.source} className="flex items-center justify-between px-5 py-3 text-sm">
                      <span className="font-medium capitalize text-slate-900">{s.source.replace(/_/g, " ")}</span>
                      <span className="font-semibold tabular-nums text-slate-700">{s.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </div>
      ) : null}

      <MarketingReport days={days} />
    </AdminPage>
  );
}
