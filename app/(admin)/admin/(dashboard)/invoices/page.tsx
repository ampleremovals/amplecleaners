"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { FileText, Receipt, Send, CheckCircle2 } from "lucide-react";
import { useAdminFetch } from "@/hooks/useAdminFetch";
import { TableSkeleton, ErrorState, EmptyState } from "@/components/admin/DataState";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { formatCurrency, formatDate } from "@/lib/utils";

interface InvoiceRow {
  id: string; invoiceNumber: string; type: "deposit" | "full_balance" | "recurring"; status: "sent" | "paid" | "cancelled" | "draft";
  total: number; dueDate: string | null; paidAt: string | null; createdAt: string; reminderCount: number;
  bookingId: string; reference: string | null; customerName: string; customerEmail: string | null; overdue: boolean;
}
interface InvoicesResponse {
  success: boolean; error?: string; invoices: InvoiceRow[];
  totals: { outstanding: number; overdue: number; paidThisMonth: number };
}

const FILTERS = [
  { key: "all", label: "All" },
  { key: "sent", label: "Unpaid" },
  { key: "overdue", label: "Overdue" },
  { key: "paid", label: "Paid" },
] as const;

const TYPE_LABEL: Record<InvoiceRow["type"], string> = { deposit: "Deposit", full_balance: "Balance", recurring: "Visit" };

function StatusPill({ row }: { row: InvoiceRow }) {
  const [label, cls] =
    row.status === "paid" ? ["Paid", "bg-brand-green-100 text-brand-green-800"]
    : row.overdue ? ["Overdue", "bg-red-100 text-red-700"]
    : row.status === "cancelled" ? ["Cancelled", "bg-slate-100 text-slate-500"]
    : ["Unpaid", "bg-amber-100 text-amber-800"];
  return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${cls}`}>{label}</span>;
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "green" | "amber" | "red" }) {
  const color = { green: "text-brand-green-800", amber: "text-amber-700", red: "text-red-700" }[tone];
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={`mt-1 font-display text-2xl font-semibold tabular-nums ${color}`}>{formatCurrency(value)}</p>
    </div>
  );
}

export default function InvoicesPage() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("all");
  const [search, setSearch] = useState("");
  const [confirming, setConfirming] = useState<InvoiceRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (filter !== "all") p.set("status", filter);
    if (search.trim()) p.set("q", search.trim());
    return `/api/admin/invoices?${p.toString()}`;
  }, [filter, search]);
  const { data, loading, error, reload } = useAdminFetch<InvoicesResponse>(query);

  async function act(row: InvoiceRow, action: "mark-paid" | "resend") {
    setBusyId(row.id);
    try {
      const res = await fetch(`/api/admin/invoices/${row.id}/${action}`, { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? "Failed");
      toast.success(action === "mark-paid" ? `${row.invoiceNumber} marked as paid` : `${row.invoiceNumber} re-sent to ${row.customerName}`);
      setConfirming(null);
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusyId(null);
    }
  }

  const rows = data?.invoices ?? [];

  return (
    <div className="p-4 sm:p-8">
      <h1 className="text-[1.65rem] font-semibold leading-tight text-slate-900">Invoices</h1>
      <p className="mt-1 text-sm text-slate-500">Balances are invoiced automatically when a job is completed.</p>

      {data && (
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Stat label="Outstanding" value={data.totals.outstanding} tone="amber" />
          <Stat label="Overdue" value={data.totals.overdue} tone="red" />
          <Stat label="Paid this month" value={data.totals.paidThisMonth} tone="green" />
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <div className="flex rounded-xl bg-slate-100 p-1">
          {FILTERS.map((f) => (
            <button key={f.key} onClick={() => setFilter(f.key)} className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-colors ${filter === f.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
              {f.label}
            </button>
          ))}
        </div>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search invoice, customer or ref…" aria-label="Search invoices" className="h-10 w-full max-w-xs rounded-xl border border-slate-200 px-3.5 text-sm outline-none focus:border-brand-green-600" />
      </div>

      <div className="mt-5">
        {loading && !data ? (
          <TableSkeleton cols={6} />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : rows.length === 0 ? (
          <EmptyState icon={<Receipt className="h-8 w-8" />} title={filter === "all" && !search ? "No invoices yet" : "No invoices match"} hint={filter === "all" && !search ? "They appear here automatically — deposits when a customer reserves, balances when a job is completed." : "Try a different filter or search."} />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium text-slate-500">
                <tr>
                  <th className="px-4 py-3">Invoice</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3 text-right">Amount</th><th className="px-4 py-3">Due</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">{r.invoiceNumber}</p>
                      {r.reference && <Link href={`/admin/bookings/${r.bookingId}`} className="text-xs text-brand-green-700 hover:underline">{r.reference}</Link>}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{r.customerName}</td>
                    <td className="px-4 py-3 text-slate-500">{TYPE_LABEL[r.type]}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-900">{formatCurrency(r.total)}</td>
                    <td className="px-4 py-3 text-slate-500">{r.status === "paid" && r.paidAt ? `Paid ${formatDate(r.paidAt)}` : r.dueDate ? formatDate(r.dueDate) : "—"}</td>
                    <td className="px-4 py-3"><StatusPill row={r} /></td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <a href={`/api/invoices/${r.id}/pdf`} target="_blank" rel="noreferrer" title="Open PDF" aria-label={`Open PDF for ${r.invoiceNumber}`} className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-100"><FileText className="h-4 w-4" /></a>
                        {r.status === "sent" && r.type !== "deposit" && (
                          <button onClick={() => act(r, "resend")} disabled={busyId === r.id} title="Re-send to customer" aria-label={`Re-send ${r.invoiceNumber}`} className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"><Send className="h-4 w-4" /></button>
                        )}
                        {r.status === "sent" && (
                          <button onClick={() => setConfirming(r)} disabled={busyId === r.id} title="Mark as paid (bank transfer)" aria-label={`Mark ${r.invoiceNumber} paid`} className="rounded-lg bg-brand-green-700 p-2 text-white hover:bg-brand-green-800 disabled:opacity-50"><CheckCircle2 className="h-4 w-4" /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!confirming}
        onOpenChange={(o) => !o && setConfirming(null)}
        title={`Mark ${confirming?.invoiceNumber ?? "invoice"} as paid?`}
        description={`Confirm ${confirming ? formatCurrency(confirming.total) : ""} from ${confirming?.customerName ?? "the customer"} has landed in the bank. ${confirming?.type === "deposit" ? "This confirms the booking and assigns a cleaner automatically." : "The booking moves to Paid and the customer gets a receipt."}`}
        confirmLabel="Yes, it's paid"
        busy={busyId === confirming?.id}
        onConfirm={() => confirming && act(confirming, "mark-paid")}
      />
    </div>
  );
}
