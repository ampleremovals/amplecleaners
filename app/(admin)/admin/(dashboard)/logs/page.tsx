"use client";

import { useState } from "react";
import { Activity, ChevronRight } from "lucide-react";
import { useAdminFetch } from "@/hooks/useAdminFetch";
import { TableSkeleton, ErrorState, EmptyState } from "@/components/admin/DataState";

interface LogRow { id: string; level: "error" | "warn" | "info"; message: string; metadata: Record<string, unknown> | null; created_at: string }
interface Response { success: boolean; error?: string; logs: LogRow[] }

const LEVELS = [{ key: "all", label: "All" }, { key: "error", label: "Errors" }, { key: "warn", label: "Warnings" }] as const;
const DAYS = [{ d: 1, label: "24h" }, { d: 7, label: "7 days" }, { d: 30, label: "30 days" }];
const BADGE = { error: "bg-red-100 text-red-700", warn: "bg-amber-100 text-amber-800", info: "bg-sky-100 text-sky-700" } as const;

export default function LogsPage() {
  const [level, setLevel] = useState<(typeof LEVELS)[number]["key"]>("all");
  const [days, setDays] = useState(7);
  const [open, setOpen] = useState<string | null>(null);
  const { data, loading, error, reload } = useAdminFetch<Response>(`/api/admin/logs?level=${level}&days=${days}`);
  const logs = data?.logs ?? [];

  return (
    <div className="p-4 sm:p-8">
      <h1 className="font-display text-2xl font-extrabold text-slate-900">System log</h1>
      <p className="mt-1 text-sm text-slate-500">Things that went wrong behind the scenes — failed emails or texts, payment webhooks, automation. Nothing here stops a booking.</p>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <div className="flex rounded-xl bg-slate-100 p-1">
          {LEVELS.map((l) => <button key={l.key} onClick={() => setLevel(l.key)} className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-colors ${level === l.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>{l.label}</button>)}
        </div>
        <div className="flex rounded-xl bg-slate-100 p-1">
          {DAYS.map((x) => <button key={x.d} onClick={() => setDays(x.d)} className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-colors ${days === x.d ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>{x.label}</button>)}
        </div>
      </div>

      <div className="mt-5">
        {loading && !data ? <TableSkeleton cols={3} />
          : error ? <ErrorState message={error} onRetry={reload} />
          : logs.length === 0 ? <EmptyState icon={<Activity className="h-8 w-8" />} title="All quiet" hint="No problems logged in this period." />
          : (
            <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
              {logs.map((l) => {
                const isOpen = open === l.id;
                const hasMeta = l.metadata && Object.keys(l.metadata).length > 0;
                return (
                  <li key={l.id}>
                    <button onClick={() => setOpen(isOpen ? null : l.id)} disabled={!hasMeta} className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 disabled:cursor-default" aria-expanded={isOpen}>
                      <span className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold uppercase ${BADGE[l.level] ?? BADGE.info}`}>{l.level}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-slate-800">{l.message}</span>
                        <span className="block text-xs text-slate-400">{new Date(l.created_at).toLocaleString("en-GB")}</span>
                        {isOpen && hasMeta && <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-600">{JSON.stringify(l.metadata, null, 2)}</pre>}
                      </span>
                      {hasMeta && <ChevronRight className={`mt-1 h-4 w-4 shrink-0 text-slate-300 transition-transform ${isOpen ? "rotate-90" : ""}`} />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
      </div>
    </div>
  );
}
