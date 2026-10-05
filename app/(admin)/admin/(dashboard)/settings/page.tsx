"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useAdminFetch } from "@/hooks/useAdminFetch";
import { ErrorState } from "@/components/admin/DataState";
import { Skeleton } from "@/components/ui/skeleton";

interface Settings {
  company_name: string; company_address: string | null; company_phone: string | null; company_email: string | null;
  google_review_link: string | null; customer_sms_enabled: boolean; customer_whatsapp_enabled: boolean;
  hourly_rate: number; min_hours: number; deposit_percentage: number;
}
interface Response { success: boolean; error?: string; settings: Settings }

const inputCls = "h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-brand-green-600";

function Toggle({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 py-3">
      <span>
        <span className="block text-sm font-semibold text-slate-800">{label}</span>
        <span className="block text-xs text-slate-500">{hint}</span>
      </span>
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-[#15803d]" />
    </label>
  );
}

export default function SettingsPage() {
  const { data, loading, error, reload } = useAdminFetch<Response>("/api/admin/settings");
  const [form, setForm] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (data?.settings) setForm(data.settings); }, [data]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? "Couldn't save");
      toast.success("Settings saved");
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save");
    } finally {
      setSaving(false);
    }
  }

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));

  return (
    <div className="p-4 sm:p-8">
      <h1 className="font-display text-2xl font-extrabold text-slate-900">Settings</h1>
      <p className="mt-1 text-sm text-slate-500">Business details used on invoices, and the customer messaging switches.</p>

      <div className="mt-6 max-w-2xl">
        {error ? <ErrorState message={error} onRetry={reload} />
          : loading || !form ? <div className="space-y-4" aria-busy="true"><Skeleton className="h-64 rounded-2xl" /><Skeleton className="h-40 rounded-2xl" /></div>
          : (
            <form onSubmit={save} className="space-y-6">
              <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
                <h2 className="font-bold text-slate-900 sm:col-span-2">Business details</h2>
                <label className="block sm:col-span-2"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Company name</span><input required className={inputCls} value={form.company_name} onChange={(e) => set("company_name", e.target.value)} /></label>
                <label className="block sm:col-span-2"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Address (shown on invoices)</span><input className={inputCls} value={form.company_address ?? ""} onChange={(e) => set("company_address", e.target.value)} /></label>
                <label className="block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Phone</span><input className={inputCls} value={form.company_phone ?? ""} onChange={(e) => set("company_phone", e.target.value)} /></label>
                <label className="block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Email</span><input type="email" className={inputCls} value={form.company_email ?? ""} onChange={(e) => set("company_email", e.target.value)} /></label>
                <label className="block sm:col-span-2"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Google review link</span><input type="url" placeholder="https://g.page/r/…" className={inputCls} value={form.google_review_link ?? ""} onChange={(e) => set("google_review_link", e.target.value)} /><span className="mt-1 block text-xs text-slate-400">Added to the thank-you email after a customer pays.</span></label>
              </section>

              <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-3">
                <div className="sm:col-span-3">
                  <h2 className="font-bold text-slate-900">Regular Cleaning pricing</h2>
                  <p className="text-xs text-slate-400">Shown on the website and used for every new booking. The deposit % applies to NEW bookings only — existing bookings keep the rate they were made at.</p>
                </div>
                <label className="block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Hourly rate (£)</span><input type="number" min={5} max={200} step={0.5} required className={inputCls} value={form.hourly_rate} onChange={(e) => set("hourly_rate", Number(e.target.value))} /></label>
                <label className="block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Minimum hours</span><input type="number" min={1} max={12} step={0.5} required className={inputCls} value={form.min_hours} onChange={(e) => set("min_hours", Number(e.target.value))} /></label>
                <label className="block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Deposit (%)</span><input type="number" min={5} max={100} step={1} required className={inputCls} value={form.deposit_percentage} onChange={(e) => set("deposit_percentage", Number(e.target.value))} /></label>
                <p className="text-sm text-slate-500 sm:col-span-3">Example: {form.min_hours} hours = <strong className="text-slate-800">£{(form.hourly_rate * form.min_hours).toFixed(2)}</strong>, deposit <strong className="text-slate-800">£{(form.hourly_rate * form.min_hours * form.deposit_percentage / 100).toFixed(2)}</strong>.</p>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white px-5 py-2">
                <h2 className="pt-3 font-bold text-slate-900">Customer messaging</h2>
                <p className="text-xs text-slate-400">Email is always sent. These switch the other two channels on or off for every customer message.</p>
                <div className="divide-y divide-slate-100">
                  <Toggle label="SMS" hint="Quotes, reminders, invoices and receipts by text message." checked={form.customer_sms_enabled} onChange={(v) => set("customer_sms_enabled", v)} />
                  <Toggle label="WhatsApp" hint="The same messages on WhatsApp." checked={form.customer_whatsapp_enabled} onChange={(v) => set("customer_whatsapp_enabled", v)} />
                </div>
              </section>

              <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-brand-green-700 px-6 py-3 text-sm font-bold text-white hover:bg-brand-green-800 disabled:opacity-60">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save settings
              </button>
            </form>
          )}
      </div>
    </div>
  );
}
