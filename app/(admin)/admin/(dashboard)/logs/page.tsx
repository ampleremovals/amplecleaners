"use client";

import { useState } from "react";
import { Activity, ChevronRight } from "lucide-react";
import { useAdminFetch } from "@/hooks/useAdminFetch";
import { TableSkeleton, ErrorState, EmptyState } from "@/components/admin/DataState";
import { Segmented } from "@/components/admin/controls";
import { AdminHero, AdminPage } from "@/components/admin/kit";
import { Panel, Pill } from "@/components/admin/ui";

interface LogRow { id: string; level: "error" | "warn" | "info"; message: string; metadata: Record<string, unknown> | null; created_at: string }
interface Response { success: boolean; error?: string; logs: LogRow[] }

const LEVELS = [{ key: "all", label: "All" }, { key: "error", label: "Errors" }, { key: "warn", label: "Warnings" }] as const;
const DAYS = [{ key: 1, label: "24h" }, { key: 7, label: "7 days" }, { key: 30, label: "30 days" }] as const;
const TONE = { error: "critical", warn: "warning", info: "info" } as const;
type LevelKey = (typeof LEVELS)[number]["key"];

export default function LogsPage() {
  const [level, setLevel] = useState<LevelKey>("all");
  const [days, setDays] = useState<number>(7);
  const [open, setOpen] = useState<string | null>(null);
  const { data, loading, error, reload } = useAdminFetch<Response>(`/api/admin/logs?level=${level}&days=${days}`);
  const logs = data?.logs ?? [];
  const errors = logs.filter((l) => l.level === "error").length;
  const warnings = logs.filter((l) => l.level === "warn").length;

  return (
    <AdminPage>
      <AdminHero
        eyebrow="System"
        title="System log"
        description="Things that went wrong behind the scenes: failed emails or texts, payment webhooks, automation. Nothing here stops a booking."
        stats={data ? [
          { label: "Errors", value: errors, hint: errors ? "Worth a look" : "None in this period", tone: errors ? "critical" : "positive" },
          { label: "Warnings", value: warnings, hint: warnings ? "Handled, but noted" : "None in this period", tone: warnings ? "warning" : "positive" },
        ] : undefined}
      />

      <div className="flex flex-wrap items-center gap-3">
        <Segmented label="Log level" value={level} onChange={setLevel} options={LEVELS.map((l) => ({ key: l.key, label: l.label }))} />
        <Segmented label="Time range" value={days} onChange={setDays} options={DAYS.map((d) => ({ key: d.key, label: d.label }))} />
      </div>

      {loading && !data ? <TableSkeleton cols={3} />
        : error ? <ErrorState message={error} onRetry={reload} />
        : logs.length === 0 ? <EmptyState icon={<Activity className="h-8 w-8" />} title="All quiet" hint="No problems logged in this period." />
        : (
          <Panel className="overflow-hidden">
            <ul className="divide-y divide-slate-100">
              {logs.map((l) => {
                const isOpen = open === l.id;
                const hasMeta = l.metadata && Object.keys(l.metadata).length > 0;
                return (
                  <li key={l.id}>
                    <button onClick={() => setOpen(isOpen ? null : l.id)} disabled={!hasMeta} className="flex w-full items-start gap-3 px-5 py-3.5 text-left transition-colors hover:bg-slate-50/70 disabled:cursor-default" aria-expanded={isOpen}>
                      <span className="mt-0.5 shrink-0"><Pill tone={TONE[l.level] ?? "info"}>{l.level}</Pill></span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-slate-800">{l.message}</span>
                        <span className="block text-xs text-slate-500">{new Date(l.created_at).toLocaleString("en-GB")}</span>
                        {isOpen && hasMeta && <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-600">{JSON.stringify(l.metadata, null, 2)}</pre>}
                      </span>
                      {hasMeta && <ChevronRight className={`mt-1 h-4 w-4 shrink-0 text-slate-300 transition-transform ${isOpen ? "rotate-90" : ""}`} />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </Panel>
        )}
    </AdminPage>
  );
}
