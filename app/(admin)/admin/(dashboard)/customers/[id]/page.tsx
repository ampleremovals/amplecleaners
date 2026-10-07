"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { ShieldAlert } from "lucide-react";
import { useAdminFetch } from "@/hooks/useAdminFetch";
import { ErrorState, EmptyState, TableSkeleton } from "@/components/admin/DataState";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { AdminHero, AdminPage, BTN, TABLE, TableCard } from "@/components/admin/kit";
import { Panel, PanelHeader, StatusBadge } from "@/components/admin/ui";
import { formatCurrency, formatDate } from "@/lib/utils";
import { SERVICE_LABELS, type BookingStatus, type ServiceType } from "@/types";

interface Response {
  success: boolean; error?: string; erased: boolean;
  customer: { id: string; full_name: string; email: string; phone: string; created_at: string };
  bookings: { id: string; reference: string; service_type: ServiceType; status: BookingStatus; clean_date: string | null; quote_total: number | null; frequency: string | null }[];
  stats: { bookings: number; paid: number; outstanding: number };
}

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, loading, error, reload } = useAdminFetch<Response>(`/api/admin/customers/${id}`);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function erase() {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/customers/${id}/erase`, { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.blockedBy?.length ? `${json.error} (${json.blockedBy.join(", ")})` : json.error ?? "Couldn't erase");
      toast.success("Personal data erased");
      setConfirming(false);
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't erase");
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  }

  if (loading && !data) return <AdminPage><TableSkeleton rows={4} cols={4} /></AdminPage>;
  if (error || !data) return <AdminPage><ErrorState message={error ?? "Couldn't load this customer."} onRetry={reload} /></AdminPage>;

  return (
    <AdminPage>
      <AdminHero
        back={{ href: "/admin/customers", label: "Customers" }}
        title={data.customer.full_name}
        description={`${data.erased ? "Personal data erased" : `${data.customer.email} · ${data.customer.phone}`} · customer since ${formatDate(data.customer.created_at)}`}
        stats={[
          { label: "Bookings", value: data.stats.bookings },
          { label: "Paid", value: formatCurrency(data.stats.paid), hint: "Money received", tone: data.stats.paid > 0 ? "positive" : "default" },
          { label: "Outstanding", value: formatCurrency(data.stats.outstanding), hint: data.stats.outstanding > 0 ? "Still to be paid" : "Nothing owed", tone: data.stats.outstanding > 0 ? "warning" : "default" },
        ]}
      />

      <div>
        <h2 className="mb-3 text-base font-semibold text-slate-900">Booking history</h2>
        {data.bookings.length === 0 ? <EmptyState title="No bookings" /> : (
          <TableCard minWidth={600}>
            <table className={TABLE.table}>
              <thead className={TABLE.head}>
                <tr><th className={TABLE.th}>Reference</th><th className={TABLE.th}>Service</th><th className={TABLE.th}>Date</th><th className={TABLE.th}>Status</th><th className={`${TABLE.th} text-right`}>Price</th></tr>
              </thead>
              <tbody>
                {data.bookings.map((b) => (
                  <tr key={b.id} className={TABLE.row}>
                    <td className={TABLE.td}><Link href={`/admin/bookings/${b.id}`} className="font-medium text-brand-green-700 hover:underline">{b.reference}</Link></td>
                    <td className={`${TABLE.td} text-slate-600`}>{SERVICE_LABELS[b.service_type]}{b.frequency && b.frequency !== "one_off" ? ` · ${b.frequency}` : ""}</td>
                    <td className={`${TABLE.td} text-slate-600`}>{b.clean_date ? formatDate(b.clean_date) : "Flexible"}</td>
                    <td className={TABLE.td}><StatusBadge status={b.status} /></td>
                    <td className={`${TABLE.td} text-right font-semibold tabular-nums`}>{b.quote_total != null ? formatCurrency(Number(b.quote_total)) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableCard>
        )}
      </div>

      {!data.erased && (
        <Panel className="border-red-200">
          <PanelHeader title="Erase personal data" hint="For a customer's right-to-erasure request." right={<ShieldAlert className="h-4 w-4 text-red-600" />} />
          <div className="p-5">
            <p className="text-sm text-slate-600">Their name, contact details, address, notes and job photos are permanently removed. Invoices and amounts are kept, as tax law requires. This cannot be undone.</p>
            <button onClick={() => setConfirming(true)} className={`${BTN.danger} mt-4`}>Erase personal data…</button>
          </div>
        </Panel>
      )}

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Permanently erase this customer's personal data?"
        description="This anonymises their name, email, phone, address and notes and deletes the photos taken in their home. Financial records stay. It cannot be undone — only continue if they have asked you to."
        confirmLabel="Yes, erase it"
        busy={busy}
        onConfirm={erase}
      />
    </AdminPage>
  );
}
