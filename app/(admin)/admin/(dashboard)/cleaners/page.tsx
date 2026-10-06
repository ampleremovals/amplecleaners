"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, Plus, ShieldCheck, ShieldAlert, Star, Users } from "lucide-react";
import { TableSkeleton, ErrorState, EmptyState } from "@/components/admin/DataState";

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

  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[1.65rem] font-semibold leading-tight text-slate-900">Cleaners</h1>
          <p className="mt-1 text-sm text-slate-500">Your roster, DBS status and pay rates.</p>
        </div>
        <button onClick={() => setShowForm((s) => !s)} className="flex items-center gap-2 rounded-xl bg-brand-green-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-green-800">
          <Plus className="h-4 w-4" /> Add cleaner
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-4">
          <input required placeholder="Full name" value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <input required placeholder="Phone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <input placeholder="Pay rate /hr (optional)" type="number" min={0} step={0.5} value={form.payRatePerHour} onChange={(e) => setForm((f) => ({ ...f, payRatePerHour: e.target.value }))} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <button type="submit" disabled={submitting} className="sm:col-span-4 flex w-fit items-center gap-2 rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Save
          </button>
        </form>
      )}

      {loading ? (
        <div className="mt-6"><TableSkeleton cols={6} /></div>
      ) : loadError ? (
        <div className="mt-6"><ErrorState message={loadError} onRetry={() => { setLoading(true); load(); }} /></div>
      ) : cleaners.length === 0 ? (
        <div className="mt-6"><EmptyState icon={<Users className="h-8 w-8" />} title="No cleaners yet" hint="Add your first cleaner — they'll get an email to set their password and use the app." /></div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">DBS</th>
                <th className="px-4 py-3">Rating</th>
                <th className="px-4 py-3">Pay rate</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {cleaners.map((c) => (
                <tr key={c.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3"><Link href={`/admin/cleaners/${c.id}`} className="font-semibold text-brand-green-700">{c.full_name}</Link></td>
                  <td className="px-4 py-3 text-slate-500">{c.email}<br />{c.phone}</td>
                  <td className="px-4 py-3">
                    {c.dbs_verified ? (
                      <span className="inline-flex items-center gap-1 text-brand-green-700"><ShieldCheck className="h-4 w-4" /> Verified</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-600"><ShieldAlert className="h-4 w-4" /> Pending</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {c.rating_avg != null ? <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> {c.rating_avg.toFixed(1)}</span> : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{c.pay_rate_per_hour != null ? `£${c.pay_rate_per_hour}/hr` : "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${c.is_active ? "bg-brand-green-100 text-brand-green-800" : "bg-slate-100 text-slate-500"}`}>
                      {c.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
