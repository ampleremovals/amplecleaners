"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { FileText, Receipt, Search, Send, CheckCircle2 } from "lucide-react";
import { useAdminFetch } from "@/hooks/useAdminFetch";
import { TableSkeleton, ErrorState, EmptyState } from "@/components/admin/DataState";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Segmented } from "@/components/admin/controls";
import { AdminHero, AdminPage, BTN, TABLE, TableCard } from "@/components/admin/kit";
import { Pill } from "@/components/admin/ui";
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
type FilterKey = (typeof FILTERS)[number]["key"];

const TYPE_LABEL: Record<InvoiceRow["type"], string> = { deposit: "Deposit", full_balance: "Balance", recurring: "Visit" };

function StatusPill({ row }: { row: InvoiceRow }) {
  if (row.status === "paid") return <Pill tone="positive">Paid</Pill>;
  if (row.overdue) return <Pill tone="critical">Overdue</Pill>;
  if (row.status === "cancelled") return <Pill tone="neutral">Cancelled</Pill>;
  return <Pill tone="warning">Unpaid</Pill>;
}

export default function InvoicesPage() {
  const [filter, setFilter] = useState<FilterKey>("all");
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
    <AdminPage>
      <AdminHero
        eyebrow="Finance"
        title="Invoices"
        description="Balances are invoiced automatically when a job is completed. Mark bank transfers as paid here."
        stats={data ? [
          { label: "Outstanding", value: formatCurrency(data.totals.outstanding), hint: data.totals.outstanding > 0 ? "Waiting to be paid" : "Nothing unpaid", tone: data.totals.outstanding > 0 ? "warning" : "default" },
          { label: "Overdue", value: formatCurrency(data.totals.overdue), hint: data.totals.overdue > 0 ? "Past the due date" : "Nothing overdue", tone: data.totals.overdue > 0 ? "critical" : "positive" },
          { label: "Paid this month", value: formatCurrency(data.totals.paidThisMonth), hint: "Money received" },
        ] : undefined}
      />

      <div className="flex flex-wrap items-center gap-3">
        <Segmented label="Filter invoices" value={filter} onChange={setFilter} options={FILTERS.map((f) => ({ key: f.key, label: f.label }))} />
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search invoice, customer or ref…" aria-label="Search invoices" className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3.5 text-sm shadow-sm outline-none transition placeholder:text-slate-400 focus:border-brand-green-600 focus:ring-4 focus:ring-brand-green-100" />
        </div>
      </div>

      {loading && !data ? (
        <TableSkeleton cols={6} />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : rows.length === 0 ? (
        <EmptyState icon={<Receipt className="h-8 w-8" />} title={filter === "all" && !search ? "No invoices yet" : "No invoices match"} hint={filter === "all" && !search ? "They appear here automatically — deposits when a customer reserves, balances when a job is completed." : "Try a different filter or search."} />
      ) : (
        <TableCard minWidth={800}>
          <table className={TABLE.table}>
            <thead className={TABLE.head}>
              <tr>
                <th className={TABLE.th}>Invoice</th><th className={TABLE.th}>Customer</th><th className={TABLE.th}>Type</th>
                <th className={`${TABLE.th} text-right`}>Amount</th><th className={TABLE.th}>Due</th><th className={TABLE.th}>Status</th><th className={`${TABLE.th} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className={TABLE.row}>
                  <td className={TABLE.td}>
                    <p className="font-medium text-slate-900">{r.invoiceNumber}</p>
                    {r.reference && <Link href={`/admin/bookings/${r.bookingId}`} className="text-xs text-slate-500 hover:text-brand-green-700 hover:underline">{r.reference}</Link>}
                  </td>
                  <td className={`${TABLE.td} text-slate-700`}>{r.customerName}</td>
                  <td className={`${TABLE.td} text-slate-600`}>{TYPE_LABEL[r.type]}</td>
                  <td className={`${TABLE.td} text-right font-semibold tabular-nums text-slate-900`}>{formatCurrency(r.total)}</td>
                  <td className={`${TABLE.td} text-slate-600`}>{r.status === "paid" && r.paidAt ? `Paid ${formatDate(r.paidAt)}` : r.dueDate ? formatDate(r.dueDate) : "—"}</td>
                  <td className={TABLE.td}><StatusPill row={r} /></td>
                  <td className={TABLE.td}>
                    <div className="flex justify-end gap-1.5">
                      <a href={`/api/invoices/${r.id}/pdf`} target="_blank" rel="noreferrer" title="Open PDF" aria-label={`Open PDF for ${r.invoiceNumber}`} className={BTN.icon}><FileText className="h-4 w-4" /></a>
                      {r.status === "sent" && r.type !== "deposit" && (
                        <button onClick={() => act(r, "resend")} disabled={busyId === r.id} title="Re-send to customer" aria-label={`Re-send ${r.invoiceNumber}`} className={BTN.icon}><Send className="h-4 w-4" /></button>
                      )}
                      {r.status === "sent" && (
                        <button onClick={() => setConfirming(r)} disabled={busyId === r.id} title="Mark as paid (bank transfer)" aria-label={`Mark ${r.invoiceNumber} paid`} className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-green-700 text-white transition-colors hover:bg-brand-green-800 disabled:opacity-50"><CheckCircle2 className="h-4 w-4" /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>
      )}

      <ConfirmDialog
        open={!!confirming}
        onOpenChange={(o) => !o && setConfirming(null)}
        title={`Mark ${confirming?.invoiceNumber ?? "invoice"} as paid?`}
        description={`Confirm ${confirming ? formatCurrency(confirming.total) : ""} from ${confirming?.customerName ?? "the customer"} has landed in the bank. ${confirming?.type === "deposit" ? "This confirms the booking and assigns a cleaner automatically." : "The booking moves to Paid and the customer gets a receipt."}`}
        confirmLabel="Yes, it's paid"
        busy={busyId === confirming?.id}
        onConfirm={() => confirming && act(confirming, "mark-paid")}
      />
    </AdminPage>
  );
}
