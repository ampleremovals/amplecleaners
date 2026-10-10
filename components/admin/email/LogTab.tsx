"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useAdminFetch } from "@/hooks/useAdminFetch";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/admin/DataState";
import { Pill } from "@/components/admin/ui";
import { BTN, INPUT, TABLE, TableCard } from "@/components/admin/kit";
import { Segmented } from "@/components/admin/controls";
import { formatWhen } from "@/components/admin/email/parts";

interface Row {
  id: string; template_key: string; category: string; to_email: string; subject: string | null; status: string; status_note: string | null;
  send_at: string; sent_at: string | null; delivered_at: string | null; opened_at: string | null; clicked_at: string | null; bounced_at: string | null; reference: string | null;
}
interface Resp { success: boolean; rows: Row[]; total: number; page: number; pageSize: number }

const FILTERS = [
  { key: "", label: "All" }, { key: "sent", label: "Sent" }, { key: "scheduled", label: "Waiting" }, { key: "skipped", label: "Skipped" }, { key: "failed", label: "Failed" },
] as const;

function StatusCell({ r }: { r: Row }) {
  if (r.bounced_at) return <Pill tone="critical">Bounced</Pill>;
  if (r.status === "sent") return r.clicked_at ? <Pill tone="positive">Clicked</Pill> : r.opened_at ? <Pill tone="positive">Opened</Pill> : r.delivered_at ? <Pill tone="info">Delivered</Pill> : <Pill tone="info">Sent</Pill>;
  if (r.status === "scheduled" || r.status === "sending") return <Pill tone="warning">Waiting</Pill>;
  if (r.status === "failed") return <Pill tone="critical">Failed</Pill>;
  return <Pill>{r.status === "cancelled" ? "Cancelled" : "Skipped"}</Pill>;
}

const CATEGORY: Record<string, string> = { system: "Booking system", service: "About their booking", marketing: "Marketing" };

export function LogTab() {
  const [status, setStatus] = useState<(typeof FILTERS)[number]["key"]>("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const url = useMemo(() => {
    const p = new URLSearchParams({ page: String(page) });
    if (status) p.set("status", status);
    if (search.trim()) p.set("q", search.trim());
    return `/api/admin/email/log?${p}`;
  }, [status, search, page]);
  const { data, loading, error, reload } = useAdminFetch<Resp>(url);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented label="Filter by status" value={status} onChange={(v) => { setStatus(v); setPage(0); }} options={FILTERS.map((f) => ({ key: f.key, label: f.label }))} />
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <input className={`${INPUT} pl-9`} placeholder="Search email, subject or type" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} aria-label="Search the send log" />
        </div>
      </div>
      {error ? <ErrorState message={error} onRetry={reload} /> : loading && !data ? <TableSkeleton rows={8} cols={5} /> : !data?.rows.length ? (
        <EmptyState title="No emails here yet" hint="Every email the platform sends, or has waiting to go, shows up in this list." />
      ) : (
        <>
          <TableCard minWidth={860}>
            <table className={TABLE.table}>
              <thead className={TABLE.head}><tr>{["Status", "To", "Email", "Booking", "When"].map((h) => <th key={h} className={TABLE.th}>{h}</th>)}</tr></thead>
              <tbody>
                {data.rows.map((r) => (
                  <tr key={r.id} className={TABLE.row}>
                    <td className={TABLE.td}><StatusCell r={r} /></td>
                    <td className={`${TABLE.td} max-w-[220px] truncate`}>{r.to_email}</td>
                    <td className={`${TABLE.td} max-w-[340px]`}>
                      <span className="block truncate font-medium text-slate-900">{r.subject ?? r.template_key}</span>
                      <span className="block truncate text-xs text-slate-500">{CATEGORY[r.category] ?? r.category}{r.status_note ? ` · ${r.status_note}` : ""}</span>
                    </td>
                    <td className={`${TABLE.td} text-slate-600`}>{r.reference ?? "–"}</td>
                    <td className={`${TABLE.td} text-slate-600`}>{formatWhen(r.sent_at ?? r.send_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableCard>
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>{data.total} email{data.total === 1 ? "" : "s"}</span>
            <div className="flex gap-2">
              <button type="button" className={BTN.secondary} disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</button>
              <button type="button" className={BTN.secondary} disabled={(page + 1) * data.pageSize >= data.total} onClick={() => setPage((p) => p + 1)}>Next</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

