"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import { SERVICE_LABELS, type ServiceType } from "@/types";
import { DEFAULT_PRICING, regularCleaningPrice, type PricingConfig } from "@/lib/pricing";
import { formatCurrency } from "@/lib/utils";

const inputCls = "h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-brand-green-600";

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      {children}
    </label>
  );
}

export default function NewBookingPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [cfg, setCfg] = useState<PricingConfig>(DEFAULT_PRICING);
  const [form, setForm] = useState({
    serviceType: "regular_cleaning" as ServiceType,
    fullName: "", email: "", phone: "",
    propertyType: "house", bedrooms: 2, bathrooms: 1,
    frequency: "weekly", hours: DEFAULT_PRICING.minHours, quoteTotal: "",
    line1: "", city: "", postcode: "",
    cleanDate: "", cleanTime: "", specialInstructions: "",
    sendQuote: true,
  });
  useEffect(() => {
    fetch("/api/admin/settings").then((r) => r.json()).then((j) => {
      if (j.success && j.settings) {
        const next = { hourlyRate: Number(j.settings.hourly_rate), minHours: Number(j.settings.min_hours), depositPercentage: Number(j.settings.deposit_percentage) };
        setCfg(next);
        setForm((f) => ({ ...f, hours: Math.max(f.hours, next.minHours) }));
      }
    }).catch(() => {});
  }, []);
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));
  const isRegular = form.serviceType === "regular_cleaning";
  const manualPrice = Number(form.quoteTotal);
  const price = manualPrice > 0 ? manualPrice : isRegular ? regularCleaningPrice(form.hours, cfg) : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/admin/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceType: form.serviceType, fullName: form.fullName, email: form.email, phone: form.phone,
          propertyType: form.propertyType, bedrooms: form.bedrooms, bathrooms: form.bathrooms,
          frequency: isRegular ? form.frequency : undefined, hours: isRegular ? form.hours : undefined,
          quoteTotal: manualPrice > 0 ? manualPrice : undefined,
          line1: form.line1, city: form.city || undefined, postcode: form.postcode,
          cleanDate: form.cleanDate || undefined, cleanTime: form.cleanTime || undefined,
          specialInstructions: form.specialInstructions || undefined,
          sendQuote: form.sendQuote && price != null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? "Couldn't create the booking");
      toast.success(`Booking ${json.reference} created${form.sendQuote && price != null ? " and quote sent" : ""}`);
      router.push(`/admin/bookings/${json.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
      setBusy(false);
    }
  }

  return (
    <div className="p-4 sm:p-8">
      <Link href="/admin/bookings" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800"><ArrowLeft className="h-4 w-4" /> Bookings</Link>
      <h1 className="mt-2 font-display text-2xl font-extrabold text-slate-900">New booking</h1>
      <p className="mt-1 text-sm text-slate-500">For phone and WhatsApp enquiries. It follows the same automation as a website booking.</p>

      <form onSubmit={submit} className="mt-6 max-w-3xl space-y-6">
        <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
          <h2 className="font-bold text-slate-900 sm:col-span-2">Customer</h2>
          <Field label="Full name"><input required className={inputCls} value={form.fullName} onChange={(e) => set("fullName", e.target.value)} /></Field>
          <Field label="Phone"><input required className={inputCls} value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="07…" /></Field>
          <Field label="Email" className="sm:col-span-2"><input required type="email" className={inputCls} value={form.email} onChange={(e) => set("email", e.target.value)} /></Field>
        </section>

        <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
          <h2 className="font-bold text-slate-900 sm:col-span-2">The job</h2>
          <Field label="Service">
            <select className={inputCls} value={form.serviceType} onChange={(e) => set("serviceType", e.target.value as ServiceType)}>
              {(Object.keys(SERVICE_LABELS) as ServiceType[]).map((s) => <option key={s} value={s}>{SERVICE_LABELS[s]}</option>)}
            </select>
          </Field>
          <Field label="Property type">
            <select className={inputCls} value={form.propertyType} onChange={(e) => set("propertyType", e.target.value)}>
              {["flat", "house", "studio", "office", "other"].map((p) => <option key={p} value={p}>{p[0].toUpperCase() + p.slice(1)}</option>)}
            </select>
          </Field>
          <Field label="Bedrooms"><input type="number" min={0} max={10} className={inputCls} value={form.bedrooms} onChange={(e) => set("bedrooms", Number(e.target.value))} /></Field>
          <Field label="Bathrooms"><input type="number" min={0} max={10} className={inputCls} value={form.bathrooms} onChange={(e) => set("bathrooms", Number(e.target.value))} /></Field>
          {isRegular && (
            <>
              <Field label="How often">
                <select className={inputCls} value={form.frequency} onChange={(e) => set("frequency", e.target.value)}>
                  {["one_off", "weekly", "fortnightly", "monthly"].map((f) => <option key={f} value={f}>{f.replace("_", " ")}</option>)}
                </select>
              </Field>
              <Field label={`Hours (£${cfg.hourlyRate}/hr, min ${cfg.minHours})`}>
                <input type="number" min={cfg.minHours} step={0.5} className={inputCls} value={form.hours} onChange={(e) => set("hours", Number(e.target.value))} />
              </Field>
            </>
          )}
          <Field label={isRegular ? "Override price (£, optional)" : "Agreed price (£, optional)"}>
            <input type="number" min={0} step={0.01} className={inputCls} value={form.quoteTotal} onChange={(e) => set("quoteTotal", e.target.value)} placeholder={isRegular ? `Leave blank to use £${cfg.hourlyRate}/hr` : "Leave blank to quote later"} />
          </Field>
          <Field label="Date"><input type="date" className={inputCls} value={form.cleanDate} onChange={(e) => set("cleanDate", e.target.value)} /></Field>
          <Field label="Start time"><input type="time" className={inputCls} value={form.cleanTime} onChange={(e) => set("cleanTime", e.target.value)} /></Field>
        </section>

        <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
          <h2 className="font-bold text-slate-900 sm:col-span-2">Address</h2>
          <Field label="Address line 1" className="sm:col-span-2"><input required className={inputCls} value={form.line1} onChange={(e) => set("line1", e.target.value)} /></Field>
          <Field label="Town / city"><input className={inputCls} value={form.city} onChange={(e) => set("city", e.target.value)} /></Field>
          <Field label="Postcode"><input required className={inputCls} value={form.postcode} onChange={(e) => set("postcode", e.target.value)} /></Field>
          <Field label="Notes for the cleaner (optional)" className="sm:col-span-2"><textarea rows={3} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-green-600" value={form.specialInstructions} onChange={(e) => set("specialInstructions", e.target.value)} /></Field>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Price</p>
            <p className="font-display text-2xl font-extrabold text-brand-green-800">{price != null ? formatCurrency(price) : "Quote later"}</p>
          </div>
          <label className={`flex items-center gap-2 text-sm ${price == null ? "opacity-40" : ""}`}>
            <input type="checkbox" disabled={price == null} checked={form.sendQuote && price != null} onChange={(e) => set("sendQuote", e.target.checked)} className="h-4 w-4" />
            Send the quote and deposit link now (email, SMS, WhatsApp)
          </label>
          <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-brand-green-700 px-6 py-3 text-sm font-bold text-white hover:bg-brand-green-800 disabled:opacity-60">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Create booking
          </button>
        </div>
      </form>
    </div>
  );
}
