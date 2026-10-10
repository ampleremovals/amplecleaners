"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useAdminFetch } from "@/hooks/useAdminFetch";
import { ErrorState } from "@/components/admin/DataState";
import { AdminHero, AdminPage, BTN, Field, INPUT } from "@/components/admin/kit";
import { Panel, PanelHeader } from "@/components/admin/ui";
import { Skeleton } from "@/components/ui/skeleton";

interface Settings {
  company_name: string; company_address: string | null; company_phone: string | null; company_email: string | null;
  google_review_link: string | null; customer_sms_enabled: boolean; customer_whatsapp_enabled: boolean;
  hourly_rate: number; min_hours: number; deposit_percentage: number; email_daily_limit: number;
}
interface Response { success: boolean; error?: string; settings: Settings }

function Toggle({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-6 px-5 py-4">
      <span>
        <span className="block text-sm font-medium text-slate-900">{label}</span>
        <span className="block text-xs text-slate-500">{hint}</span>
      </span>
      <span className="relative inline-flex shrink-0">
        <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
        <span className="h-6 w-11 rounded-full bg-slate-200 transition-colors peer-checked:bg-brand-green-700 peer-focus-visible:ring-4 peer-focus-visible:ring-brand-green-100" aria-hidden />
        <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" aria-hidden />
      </span>
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
    <AdminPage>
      <AdminHero
        eyebrow="System"
        title="Settings"
        description="Business details used on invoices, your Regular Cleaning prices, and the customer messaging switches."
        stats={form ? [
          { label: "Hourly rate", value: `£${form.hourly_rate}`, hint: `${form.min_hours} hour minimum` },
          { label: "Minimum booking", value: `£${(form.hourly_rate * form.min_hours).toFixed(2)}`, hint: "Regular Cleaning, from" },
          { label: "Deposit", value: `${form.deposit_percentage}%`, hint: `£${(form.hourly_rate * form.min_hours * form.deposit_percentage / 100).toFixed(2)} on the minimum` },
        ] : undefined}
      />

      <div className="max-w-3xl">
        {error ? <ErrorState message={error} onRetry={reload} />
          : loading || !form ? <div className="space-y-4" aria-busy="true"><Skeleton className="h-64 rounded-xl" /><Skeleton className="h-40 rounded-xl" /></div>
          : (
            <form onSubmit={save} className="space-y-6">
              <Panel>
                <PanelHeader title="Business details" hint="Shown on invoices and in customer messages." />
                <div className="grid gap-4 p-5 sm:grid-cols-2">
                  <Field label="Company name" className="sm:col-span-2"><input required className={INPUT} value={form.company_name} onChange={(e) => set("company_name", e.target.value)} /></Field>
                  <Field label="Address (shown on invoices)" className="sm:col-span-2"><input className={INPUT} value={form.company_address ?? ""} onChange={(e) => set("company_address", e.target.value)} /></Field>
                  <Field label="Phone"><input className={INPUT} value={form.company_phone ?? ""} onChange={(e) => set("company_phone", e.target.value)} /></Field>
                  <Field label="Email"><input type="email" className={INPUT} value={form.company_email ?? ""} onChange={(e) => set("company_email", e.target.value)} /></Field>
                  <Field label="Google review link" className="sm:col-span-2">
                    <input type="url" placeholder="https://g.page/r/…" className={INPUT} value={form.google_review_link ?? ""} onChange={(e) => set("google_review_link", e.target.value)} />
                    <span className="mt-1.5 block text-xs text-slate-500">Used in the thank-you email and the automatic &ldquo;Happy customer: Google review&rdquo; email. Without it, those review requests are skipped.</span>
                  </Field>
                </div>
              </Panel>

              <Panel>
                <PanelHeader title="Regular Cleaning pricing" hint="Shown on the website and used for every new booking. The deposit % applies to NEW bookings only; existing bookings keep the rate they were made at." />
                <div className="grid gap-4 p-5 sm:grid-cols-3">
                  <Field label="Hourly rate (£)"><input type="number" min={5} max={200} step={0.5} required className={INPUT} value={form.hourly_rate} onChange={(e) => set("hourly_rate", Number(e.target.value))} /></Field>
                  <Field label="Minimum hours"><input type="number" min={1} max={12} step={0.5} required className={INPUT} value={form.min_hours} onChange={(e) => set("min_hours", Number(e.target.value))} /></Field>
                  <Field label="Deposit (%)"><input type="number" min={5} max={100} step={1} required className={INPUT} value={form.deposit_percentage} onChange={(e) => set("deposit_percentage", Number(e.target.value))} /></Field>
                  <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600 sm:col-span-3">
                    Example: {form.min_hours} hours = <strong className="text-slate-900">£{(form.hourly_rate * form.min_hours).toFixed(2)}</strong>, deposit <strong className="text-slate-900">£{(form.hourly_rate * form.min_hours * form.deposit_percentage / 100).toFixed(2)}</strong>.
                  </p>
                </div>
              </Panel>

              <Panel>
                <PanelHeader title="Customer messaging" hint="Email is always sent. These switch the other two channels on or off for every customer message." />
                <div className="divide-y divide-slate-100">
                  <Toggle label="SMS" hint="Quotes, reminders, invoices and receipts by text message." checked={form.customer_sms_enabled} onChange={(v) => set("customer_sms_enabled", v)} />
                  <Toggle label="WhatsApp" hint="The same messages on WhatsApp." checked={form.customer_whatsapp_enabled} onChange={(v) => set("customer_whatsapp_enabled", v)} />
                </div>
              </Panel>

              <Panel>
                <PanelHeader title="Email sending limit" hint="Your email provider caps how many emails you can send. Booking emails always get through: automatic marketing stops before the cap so there is room left for them." />
                <div className="grid gap-4 p-5 sm:grid-cols-3">
                  <Field label="Emails per day your plan allows"><input type="number" min={20} max={100000} step={10} required className={INPUT} value={form.email_daily_limit} onChange={(e) => set("email_daily_limit", Number(e.target.value))} /></Field>
                  <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600 sm:col-span-2">Resend&apos;s free plan allows 100 a day; paid plans allow far more. Raise this once you upgrade. About {Math.max(10, Math.ceil(form.email_daily_limit * 0.2))} a day are always kept free for booking emails.</p>
                </div>
              </Panel>

              <button type="submit" disabled={saving} className={BTN.primary}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save settings
              </button>
            </form>
          )}
      </div>
    </AdminPage>
  );
}
