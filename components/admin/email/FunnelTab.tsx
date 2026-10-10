"use client";

import { useState } from "react";
import { useAdminFetch } from "@/hooks/useAdminFetch";
import { ErrorState } from "@/components/admin/DataState";
import { Panel, PanelHeader } from "@/components/admin/ui";
import { TABLE, TableCard } from "@/components/admin/kit";
import { Segmented } from "@/components/admin/controls";
import { pct } from "@/components/admin/email/parts";
import { Skeleton } from "@/components/ui/skeleton";

interface Stage { key: string; label: string; count: number; ofEnquiries: number; ofPrevious: number }
interface Resp {
  success: boolean; days: number; stages: Stage[]; conversion: number; helpedByEmail: number; lost: number;
  abandoned: { captured: number; recovered: number }; lostReasons: { reason: string; count: number }[]; bySource: { source: string; enquiries: number; confirmed: number; rate: number }[];
}

export function FunnelTab({ stats }: { stats: { sent: number; delivered: number; opened: number; clicked: number; bounced: number } }) {
  const [days, setDays] = useState<7 | 30 | 90 | 365>(30);
  const { data, loading, error, reload } = useAdminFetch<Resp>(`/api/admin/email/funnel?days=${days}`);
  if (error) return <ErrorState message={error} onRetry={reload} />;
  const top = data?.stages[0]?.count || 1;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-slate-500">Everyone who enquired in the period, counted once at the furthest step they reached. The honest way to see where leads drop off.</p>
        <Segmented label="Period" value={days} onChange={setDays} options={[{ key: 7, label: "7 days" }, { key: 30, label: "30 days" }, { key: 90, label: "90 days" }, { key: 365, label: "Year" }]} />
      </div>
      {loading && !data ? <Skeleton className="h-72 w-full rounded-xl" /> : data && (
        <>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <Panel>
              <PanelHeader title="Enquiry to paid" hint={`${data.stages[0].count} enquiries in the last ${data.days} days`} right={<div className="text-right"><p className="text-2xl font-semibold tabular-nums text-slate-900">{data.conversion}%</p><p className="text-xs text-slate-500">enquiries → deposit paid</p></div>} />
              <ol className="space-y-4 p-5">
                {data.stages.map((s, i) => (
                  <li key={s.key}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                      <span className="font-medium text-slate-900">{s.label}</span>
                      <span className="tabular-nums text-slate-600"><strong className="text-slate-900">{s.count}</strong>{i > 0 && <span className="text-slate-400"> · {s.ofPrevious}% of the step before</span>}</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand-green-600" style={{ width: `${Math.max(2, (s.count / top) * 100)}%` }} /></div>
                  </li>
                ))}
              </ol>
            </Panel>
            <div className="space-y-4">
              <Panel>
                <PanelHeader title="What email did" hint={`Last ${data.days} days`} />
                <dl className="divide-y divide-slate-100 text-sm">
                  <div className="flex justify-between gap-3 px-5 py-3"><dt className="text-slate-600">Bookings that had a follow-up email before they confirmed</dt><dd className="font-semibold tabular-nums">{data.helpedByEmail}</dd></div>
                  <div className="flex justify-between gap-3 px-5 py-3"><dt className="text-slate-600">Unfinished forms captured</dt><dd className="font-semibold tabular-nums">{data.abandoned.captured}</dd></div>
                  <div className="flex justify-between gap-3 px-5 py-3"><dt className="text-slate-600">…that later became a booking</dt><dd className="font-semibold tabular-nums">{data.abandoned.recovered}</dd></div>
                  <div className="flex justify-between gap-3 px-5 py-3"><dt className="text-slate-600">Enquiries lost (cancelled or not a fit)</dt><dd className="font-semibold tabular-nums">{data.lost}</dd></div>
                </dl>
              </Panel>
              <Panel>
                <PanelHeader title="Email delivery" hint="Last 30 days, all emails" />
                <dl className="grid grid-cols-2 gap-px bg-slate-100 text-sm">
                  {[["Sent", stats.sent], ["Delivered", pct(stats.delivered, stats.sent)], ["Opened", pct(stats.opened, stats.sent)], ["Clicked", pct(stats.clicked, stats.sent)]].map(([k, v]) => (
                    <div key={String(k)} className="bg-white px-5 py-3"><dt className="text-xs text-slate-500">{k}</dt><dd className="text-lg font-semibold tabular-nums text-slate-900">{v}</dd></div>
                  ))}
                </dl>
                {stats.delivered === 0 && stats.sent > 0 && <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">Delivery numbers fill in once delivery tracking is connected.</p>}
              </Panel>
            </div>
          </div>
          <Panel>
            <PanelHeader title="Why leads were lost" hint="From the reason picked when a booking is moved to Lost" />
            {data.lostReasons.length ? (
              <ul className="divide-y divide-slate-100 text-sm">
                {data.lostReasons.map((r) => (
                  <li key={r.reason} className="flex items-center justify-between gap-3 px-5 py-3"><span className="text-slate-700">{r.reason}</span><span className="font-semibold tabular-nums text-slate-900">{r.count}</span></li>
                ))}
              </ul>
            ) : <p className="px-5 py-8 text-center text-sm text-slate-500">No lost leads in this period.</p>}
          </Panel>
          <Panel>
            <PanelHeader title="Where enquiries come from" hint="Conversion by source" />
            {data.bySource.length ? (
              <TableCard minWidth={480}>
                <table className={TABLE.table}>
                  <thead className={TABLE.head}><tr>{["Source", "Enquiries", "Deposit paid", "Conversion"].map((h) => <th key={h} className={TABLE.th}>{h}</th>)}</tr></thead>
                  <tbody>{data.bySource.map((s) => (
                    <tr key={s.source} className={TABLE.row}><td className={`${TABLE.td} font-medium text-slate-900`}>{s.source}</td><td className={TABLE.td}>{s.enquiries}</td><td className={TABLE.td}>{s.confirmed}</td><td className={TABLE.td}>{s.rate}%</td></tr>
                  ))}</tbody>
                </table>
              </TableCard>
            ) : <p className="px-5 py-8 text-center text-sm text-slate-500">No enquiries in this period.</p>}
          </Panel>
        </>
      )}
    </div>
  );
}
