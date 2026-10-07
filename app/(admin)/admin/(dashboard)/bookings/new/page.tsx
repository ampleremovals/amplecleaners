"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { SERVICE_LABELS, type ServiceType } from "@/types";
import { DEFAULT_PRICING, regularCleaningPrice, type PricingConfig } from "@/lib/pricing";
import { formatCurrency } from "@/lib/utils";
import { AdminHero, AdminPage, BTN, Field, INPUT, TEXTAREA } from "@/components/admin/kit";
import { Panel, PanelHeader } from "@/components/admin/ui";

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
    <AdminPage>
      <AdminHero
        back={{ href: "/admin/bookings", label: "Bookings" }}
        eyebrow="Operations"
        title="New booking"
        description="For phone and WhatsApp enquiries. It follows the same automation as a website booking."
        stats={[
          { label: "Price", value: price != null ? formatCurrency(price) : "Quote later", hint: price != null ? `${Math.round(cfg.depositPercentage)}% deposit: ${formatCurrency(Math.round(price * cfg.depositPercentage) / 100)}` : "Set a price to send a quote" },
        ]}
      />

      <form onSubmit={submit} className="max-w-3xl space-y-6">
        <Panel>
          <PanelHeader title="Customer" hint="Who is booking?" />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Full name"><input required className={INPUT} value={form.fullName} onChange={(e) => set("fullName", e.target.value)} /></Field>
            <Field label="Phone"><input required className={INPUT} value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="07…" /></Field>
            <Field label="Email" className="sm:col-span-2"><input required type="email" className={INPUT} value={form.email} onChange={(e) => set("email", e.target.value)} /></Field>
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="The job" hint="What needs cleaning, and when." />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Service">
              <select className={INPUT} value={form.serviceType} onChange={(e) => set("serviceType", e.target.value as ServiceType)}>
                {(Object.keys(SERVICE_LABELS) as ServiceType[]).map((s) => <option key={s} value={s}>{SERVICE_LABELS[s]}</option>)}
              </select>
            </Field>
            <Field label="Property type">
              <select className={INPUT} value={form.propertyType} onChange={(e) => set("propertyType", e.target.value)}>
                {["flat", "house", "studio", "office", "other"].map((p) => <option key={p} value={p}>{p[0].toUpperCase() + p.slice(1)}</option>)}
              </select>
            </Field>
            <Field label="Bedrooms"><input type="number" min={0} max={10} className={INPUT} value={form.bedrooms} onChange={(e) => set("bedrooms", Number(e.target.value))} /></Field>
            <Field label="Bathrooms"><input type="number" min={0} max={10} className={INPUT} value={form.bathrooms} onChange={(e) => set("bathrooms", Number(e.target.value))} /></Field>
            {isRegular && (
              <>
                <Field label="How often">
                  <select className={INPUT} value={form.frequency} onChange={(e) => set("frequency", e.target.value)}>
                    {["one_off", "weekly", "fortnightly", "monthly"].map((f) => <option key={f} value={f}>{f.replace("_", " ")}</option>)}
                  </select>
                </Field>
                <Field label={`Hours (£${cfg.hourlyRate}/hr, min ${cfg.minHours})`}>
                  <input type="number" min={cfg.minHours} step={0.5} className={INPUT} value={form.hours} onChange={(e) => set("hours", Number(e.target.value))} />
                </Field>
              </>
            )}
            <Field label={isRegular ? "Override price (£, optional)" : "Agreed price (£, optional)"}>
              <input type="number" min={0} step={0.01} className={INPUT} value={form.quoteTotal} onChange={(e) => set("quoteTotal", e.target.value)} placeholder={isRegular ? `Leave blank to use £${cfg.hourlyRate}/hr` : "Leave blank to quote later"} />
            </Field>
            <Field label="Date"><input type="date" className={INPUT} value={form.cleanDate} onChange={(e) => set("cleanDate", e.target.value)} /></Field>
            <Field label="Start time"><input type="time" className={INPUT} value={form.cleanTime} onChange={(e) => set("cleanTime", e.target.value)} /></Field>
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Address" hint="Where the clean takes place." />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Address line 1" className="sm:col-span-2"><input required className={INPUT} value={form.line1} onChange={(e) => set("line1", e.target.value)} /></Field>
            <Field label="Town / city"><input className={INPUT} value={form.city} onChange={(e) => set("city", e.target.value)} /></Field>
            <Field label="Postcode"><input required className={INPUT} value={form.postcode} onChange={(e) => set("postcode", e.target.value)} /></Field>
            <Field label="Notes for the cleaner (optional)" className="sm:col-span-2"><textarea rows={3} className={TEXTAREA} value={form.specialInstructions} onChange={(e) => set("specialInstructions", e.target.value)} /></Field>
          </div>
        </Panel>

        <Panel>
          <div className="flex flex-wrap items-center justify-between gap-4 p-5">
            <label className={`flex items-center gap-2.5 text-sm text-slate-700 ${price == null ? "opacity-40" : ""}`}>
              <input type="checkbox" disabled={price == null} checked={form.sendQuote && price != null} onChange={(e) => set("sendQuote", e.target.checked)} className="h-4 w-4 accent-brand-green-700" />
              Send the quote and deposit link now (email, SMS, WhatsApp)
            </label>
            <button type="submit" disabled={busy} className={BTN.primary}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Create booking
            </button>
          </div>
        </Panel>
      </form>
    </AdminPage>
  );
}
