"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { useAdminFetch } from "@/hooks/useAdminFetch";
import { ErrorState, EmptyState, TableSkeleton } from "@/components/admin/DataState";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { formatCurrency, formatDate } from "@/lib/utils";
import { BOOKING_STATUS_LABELS, SERVICE_LABELS, type BookingStatus, type ServiceType } from "@/types";

interface Response {
  success: boolean; error?: string; erased: boolean;
  customer: { id: string; full_name: string; email: string; phone: string; created_at: string };
  bookings: { id: string; reference: string; service_type: ServiceType; status: BookingStatus; clean_date: string | null; quote_total: number | null; frequency: string | null }[];
  stats: { bookings: number; paid: number; outstanding: number };
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-slate-900">{value}</p>
    </div>
  );
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

  return (
    <div className="p-4 sm:p-8">
      <Link href="/admin/customers" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800"><ArrowLeft className="h-4 w-4" /> Customers</Link>

      {loading && !data ? <div className="mt-6"><TableSkeleton rows={4} cols={4} /></div>
        : error || !data ? <div className="mt-6"><ErrorState message={error ?? "Couldn't load this customer."} onRetry={reload} /></div>
        : (
          <>
            <h1 className="mt-2 text-[1.65rem] font-semibold leading-tight text-slate-900">{data.customer.full_name}</h1>
            <p className="mt-1 text-sm text-slate-500">{data.erased ? "Personal data erased" : `${data.customer.email} · ${data.customer.phone}`} · customer since {formatDate(data.customer.created_at)}</p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <Stat label="Bookings" value={String(data.stats.bookings)} />
              <Stat label="Paid" value={formatCurrency(data.stats.paid)} />
              <Stat label="Outstanding" value={formatCurrency(data.stats.outstanding)} />
            </div>

            <h2 className="mt-8 font-bold text-slate-900">Booking history</h2>
            <div className="mt-3">
              {data.bookings.length === 0 ? <EmptyState title="No bookings" /> : (
                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                  <table className="w-full min-w-[560px] text-sm">
                    <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium text-slate-500">
                      <tr><th className="px-4 py-3">Reference</th><th className="px-4 py-3">Service</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Price</th></tr>
                    </thead>
                    <tbody>
                      {data.bookings.map((b) => (
                        <tr key={b.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                          <td className="px-4 py-3"><Link href={`/admin/bookings/${b.id}`} className="font-semibold text-brand-green-700 hover:underline">{b.reference}</Link></td>
                          <td className="px-4 py-3 text-slate-600">{SERVICE_LABELS[b.service_type]}{b.frequency && b.frequency !== "one_off" ? ` · ${b.frequency}` : ""}</td>
                          <td className="px-4 py-3 text-slate-500">{b.clean_date ? formatDate(b.clean_date) : "Flexible"}</td>
                          <td className="px-4 py-3"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{BOOKING_STATUS_LABELS[b.status]}</span></td>
                          <td className="px-4 py-3 text-right font-semibold tabular-nums">{b.quote_total != null ? formatCurrency(Number(b.quote_total)) : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {!data.erased && (
              <section className="mt-10 rounded-xl border border-red-200 bg-red-50/50 p-5">
                <h2 className="flex items-center gap-2 font-bold text-red-800"><ShieldAlert className="h-4 w-4" /> Erase personal data</h2>
                <p className="mt-1 text-sm text-red-700/80">For a customer&apos;s right-to-erasure request. Their name, contact details, address, notes and job photos are permanently removed. Invoices and amounts are kept, as tax law requires. This cannot be undone.</p>
                <button onClick={() => setConfirming(true)} className="mt-3 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50">Erase personal data…</button>
              </section>
            )}
          </>
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
    </div>
  );
}
