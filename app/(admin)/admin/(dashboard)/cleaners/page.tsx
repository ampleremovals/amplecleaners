"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, ShieldCheck, ShieldAlert, Star, Users } from "lucide-react";
import { TableSkeleton, ErrorState, EmptyState } from "@/components/admin/DataState";
import { AdminHero, AdminPage, BTN, HERO_BTN, INPUT, PersonCell, TABLE, TableCard } from "@/components/admin/kit";
import { Panel, PanelHeader, Pill } from "@/components/admin/ui";

interface Cleaner {
  id: string; full_name: string; email: string; phone: string;
  is_active: boolean; dbs_verified: boolean; rating_avg: number | null; pay_rate_per_hour: number | null;
}

export default function CleanersPage() {
  const [cleaners, setCleaners] = useState<Cleaner[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", payRatePerHour: "" });
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoadError(null);
    try {
      const res = await fetch("/api/admin/cleaners").then((r) => r.json());
      if (res.success) setCleaners(res.cleaners); else setLoadError(res.error ?? "Couldn't load cleaners.");
    } catch {
      setLoadError("Network error — check your connection.");
    }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/cleaners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.fullName, email: form.email, phone: form.phone,
          payRatePerHour: form.payRatePerHour ? Number(form.payRatePerHour) : undefined,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      toast.success("Cleaner added");
      setForm({ fullName: "", email: "", phone: "", payRatePerHour: "" });
      setShowForm(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add cleaner");
    } finally {
      setSubmitting(false);
    }
  }

  const active = cleaners.filter((c) => c.is_active).length;
  const verified = cleaners.filter((c) => c.dbs_verified).length;
  const rated = cleaners.filter((c) => c.rating_avg != null);
  const avgRating = rated.length ? rated.reduce((s, c) => s + (c.rating_avg ?? 0), 0) / rated.length : null;
  const paid = cleaners.filter((c) => c.pay_rate_per_hour != null);
  const avgPay = paid.length ? paid.reduce((s, c) => s + (c.pay_rate_per_hour ?? 0), 0) / paid.length : null;

  return (
    <AdminPage>
      <AdminHero
        eyebrow="Operations"
        title="Cleaners"
        description="Your roster, DBS status and pay rates. Only DBS-verified cleaners are auto-assigned to jobs."
        actions={<button onClick={() => setShowForm((s) => !s)} className={HERO_BTN.primary}><Plus className="h-4 w-4" /> Add cleaner</button>}
        stats={loading || loadError ? undefined : [
          { label: "Active cleaners", value: active, hint: `${cleaners.length} on the roster` },
          { label: "DBS verified", value: `${verified}/${cleaners.length}`, hint: verified === cleaners.length ? "Everyone is cleared" : `${cleaners.length - verified} awaiting a check`, tone: verified === cleaners.length ? "positive" : "warning" },
          { label: "Average rating", value: avgRating != null ? avgRating.toFixed(1) : "—", hint: avgRating != null ? `from ${rated.length} rated cleaner${rated.length === 1 ? "" : "s"}` : "No customer ratings yet" },
          { label: "Average pay rate", value: avgPay != null ? `£${avgPay.toFixed(2)}` : "—", hint: "per hour" },
        ]}
      />

      {showForm && (
        <Panel>
          <PanelHeader title="Add a cleaner" hint="They'll get an email to set a password and sign in to the app." />
          <form onSubmit={handleAdd} className="grid gap-3 p-5 sm:grid-cols-4">
            <input required placeholder="Full name" aria-label="Full name" value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} className={INPUT} />
            <input required type="email" placeholder="Email" aria-label="Email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className={INPUT} />
            <input required placeholder="Phone" aria-label="Phone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className={INPUT} />
            <input placeholder="Pay rate /hr (optional)" aria-label="Pay rate per hour" type="number" min={0} step={0.5} value={form.payRatePerHour} onChange={(e) => setForm((f) => ({ ...f, payRatePerHour: e.target.value }))} className={INPUT} />
            <div className="flex gap-2 sm:col-span-4">
              <button type="submit" disabled={submitting} className={BTN.primary}>{submitting && <Loader2 className="h-4 w-4 animate-spin" />} Save cleaner</button>
              <button type="button" onClick={() => setShowForm(false)} className={BTN.secondary}>Cancel</button>
            </div>
          </form>
        </Panel>
      )}

      {loading ? (
        <TableSkeleton cols={6} />
      ) : loadError ? (
        <ErrorState message={loadError} onRetry={() => { setLoading(true); load(); }} />
      ) : cleaners.length === 0 ? (
        <EmptyState icon={<Users className="h-8 w-8" />} title="No cleaners yet" hint="Add your first cleaner — they'll get an email to set their password and use the app." />
      ) : (
        <TableCard minWidth={720}>
          <table className={TABLE.table}>
            <thead className={TABLE.head}>
              <tr>
                <th className={TABLE.th}>Cleaner</th>
                <th className={TABLE.th}>Phone</th>
                <th className={TABLE.th}>DBS</th>
                <th className={TABLE.th}>Rating</th>
                <th className={`${TABLE.th} text-right`}>Pay rate</th>
                <th className={TABLE.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {cleaners.map((c) => (
                <tr key={c.id} className={TABLE.row}>
                  <td className={TABLE.td}><PersonCell name={c.full_name} sub={c.email} href={`/admin/cleaners/${c.id}`} /></td>
                  <td className={`${TABLE.td} tabular-nums text-slate-600`}>{c.phone}</td>
                  <td className={TABLE.td}>
                    {c.dbs_verified
                      ? <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-emerald-700"><ShieldCheck className="h-4 w-4" /> Verified</span>
                      : <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-amber-700"><ShieldAlert className="h-4 w-4" /> Pending</span>}
                  </td>
                  <td className={TABLE.td}>
                    {c.rating_avg != null
                      ? <span className="inline-flex items-center gap-1 font-medium text-slate-800"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> {c.rating_avg.toFixed(1)}</span>
                      : <span className="text-slate-400">No ratings yet</span>}
                  </td>
                  <td className={`${TABLE.td} text-right font-medium tabular-nums text-slate-800`}>{c.pay_rate_per_hour != null ? `£${c.pay_rate_per_hour}/hr` : "—"}</td>
                  <td className={TABLE.td}><Pill tone={c.is_active ? "positive" : "neutral"}>{c.is_active ? "Active" : "Inactive"}</Pill></td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>
      )}
    </AdminPage>
  );
}
