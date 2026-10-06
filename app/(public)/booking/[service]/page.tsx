"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Loader2, Minus, Plus, Sparkles } from "lucide-react";
import { SERVICE_LABELS, type ServiceType } from "@/types";
import { usePricing } from "@/components/shared/PricingProvider";
import { readAttribution } from "@/components/shared/attribution";

const VALID_SERVICES = Object.keys(SERVICE_LABELS) as ServiceType[];
const gbp = (n: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n);

export default function BookingWizardPage() {
  const params = useParams();
  const router = useRouter();
  const service = params.service as string;
  const valid = VALID_SERVICES.includes(service as ServiceType);
  const serviceType = valid ? (service as ServiceType) : "regular_cleaning";
  const { hourlyRate, minHours, depositPercentage, price } = usePricing();

  const [form, setForm] = useState({
    fullName: "", email: "", phone: "",
    propertyType: "house" as "flat" | "house" | "studio" | "office" | "other",
    bedrooms: 2, bathrooms: 1,
    frequency: "weekly" as "one_off" | "weekly" | "fortnightly" | "monthly",
    hours: minHours,
    line1: "", line2: "", city: "", postcode: "",
    cleanDate: "", isFlexibleDate: false,
    specialInstructions: "",
  });
  // Arriving from a local page (utm_content=area-<slug>): pre-fill the town so the customer has one less field to type.
  useEffect(() => {
    const content = readAttribution().utm_content;
    if (!content?.startsWith("area-")) return;
    const town = content.slice(5).split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    setForm((f) => (f.city ? f : { ...f, city: town }));
  }, []);
  // Arriving from the homepage price calculator (?hours=5): keep the hours the customer already chose.
  useEffect(() => {
    const wanted = Number(new URLSearchParams(window.location.search).get("hours"));
    if (!Number.isInteger(wanted) || wanted < minHours || wanted > 12) return;
    setForm((f) => ({ ...f, hours: wanted }));
  }, [minHours]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const isRegular = serviceType === "regular_cleaning";
  const deposit = Math.round(price(form.hours) * depositPercentage) / 100;

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceType, ...form, attribution: readAttribution() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Something went wrong.");
      const totalParam = data.total != null ? `&total=${encodeURIComponent(data.total)}` : "";
      const payParam = data.quotePath ? `&pay=${encodeURIComponent(data.quotePath)}` : "";
      router.push(`/confirmation?ref=${encodeURIComponent(data.reference)}${totalParam}${payParam}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-brand-green-50 via-white to-brand-sky-50 px-4 py-12 sm:py-16">
      <div className="mx-auto w-full max-w-xl">
        <h1 className="font-display text-3xl font-extrabold text-slate-900">
          {isRegular ? "See your exact price in 2 minutes" : `Get your fixed price for ${SERVICE_LABELS[serviceType].toLowerCase()}`}
        </h1>
        <p className="mt-2 text-slate-700">{isRegular ? "Choose your hours and tell us where — your total appears instantly. No card needed, no obligation." : "Tell us about the property and we'll send a fixed price. No card needed, no obligation, no pressure."}</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name">
              <input required value={form.fullName} onChange={(e) => set("fullName", e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 px-3.5 text-sm outline-none focus:border-brand-green-600" />
            </Field>
            <Field label="Phone">
              <input required value={form.phone} onChange={(e) => set("phone", e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 px-3.5 text-sm outline-none focus:border-brand-green-600" placeholder="07…" />
            </Field>
          </div>
          <Field label="Email">
            <input required type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 px-3.5 text-sm outline-none focus:border-brand-green-600" />
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Property type">
              <select value={form.propertyType} onChange={(e) => set("propertyType", e.target.value as typeof form.propertyType)} className="h-11 w-full rounded-xl border border-slate-200 px-3.5 text-sm outline-none focus:border-brand-green-600">
                <option value="flat">Flat</option>
                <option value="house">House</option>
                <option value="studio">Studio</option>
                <option value="office">Office</option>
                <option value="other">Other</option>
              </select>
            </Field>
            <Field label="Bedrooms">
              <input type="number" min={0} max={10} value={form.bedrooms} onChange={(e) => set("bedrooms", Number(e.target.value))} className="h-11 w-full rounded-xl border border-slate-200 px-3.5 text-sm outline-none focus:border-brand-green-600" />
            </Field>
            <Field label="Bathrooms">
              <input type="number" min={0} max={10} value={form.bathrooms} onChange={(e) => set("bathrooms", Number(e.target.value))} className="h-11 w-full rounded-xl border border-slate-200 px-3.5 text-sm outline-none focus:border-brand-green-600" />
            </Field>
          </div>

          {serviceType === "regular_cleaning" && (
            <>
              <Field label="How often?">
                <select value={form.frequency} onChange={(e) => set("frequency", e.target.value as typeof form.frequency)} className="h-11 w-full rounded-xl border border-slate-200 px-3.5 text-sm outline-none focus:border-brand-green-600">
                  <option value="weekly">Weekly</option>
                  <option value="fortnightly">Fortnightly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </Field>

              <Field label={`How many hours? (£${hourlyRate}/hour, ${minHours} hours minimum)`}>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => set("hours", Math.max(minHours, form.hours - 1))}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:border-brand-green-400 hover:text-brand-green-700"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <div className="flex h-11 flex-1 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-900">
                    {form.hours} {form.hours === 1 ? "hour" : "hours"}
                  </div>
                  <button
                    type="button"
                    onClick={() => set("hours", form.hours + 1)}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:border-brand-green-400 hover:text-brand-green-700"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </Field>

              <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-brand-green-50 to-brand-sky-50 px-5 py-4">
                <span className="flex items-center gap-2 text-sm font-semibold text-brand-green-900">
                  <Sparkles className="h-4 w-4 text-brand-green-600" /> Your fixed price
                </span>
                <span className="text-right">
                  <span className="block font-display text-2xl font-extrabold text-brand-green-800">{gbp(price(form.hours))}</span>
                  <span className="block text-xs font-semibold text-brand-green-900">Secure your date for just {gbp(deposit)}</span>
                </span>
              </div>
            </>
          )}

          <Field label="Address line 1">
            <input required value={form.line1} onChange={(e) => set("line1", e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 px-3.5 text-sm outline-none focus:border-brand-green-600" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Town / city">
              <input value={form.city} onChange={(e) => set("city", e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 px-3.5 text-sm outline-none focus:border-brand-green-600" />
            </Field>
            <Field label="Postcode">
              <input required value={form.postcode} onChange={(e) => set("postcode", e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 px-3.5 text-sm outline-none focus:border-brand-green-600" />
            </Field>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="flex"
              type="checkbox"
              checked={form.isFlexibleDate}
              onChange={(e) => set("isFlexibleDate", e.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            <label htmlFor="flex" className="text-sm text-slate-600">My date is flexible</label>
          </div>
          {!form.isFlexibleDate && (
            <Field label="Preferred date">
              <input type="date" value={form.cleanDate} onChange={(e) => set("cleanDate", e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 px-3.5 text-sm outline-none focus:border-brand-green-600" />
            </Field>
          )}

          <Field label="Anything else we should know? (optional)">
            <textarea
              value={form.specialInstructions}
              onChange={(e) => set("specialInstructions", e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-green-600"
            />
          </Field>

          {error && <p className="text-sm font-semibold text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-brand-green-700 text-base font-bold text-white shadow-lg shadow-brand-green-200 hover:bg-brand-green-800 disabled:opacity-60"
          >
            {submitting && <Loader2 className="h-5 w-5 animate-spin" />}
            {isRegular ? "Get my price & secure my slot" : "Get my fixed price"}
          </button>
          <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs font-semibold text-slate-700">
            <li>✓ DBS-checked cleaners</li>
            <li>✓ Price never changes on the day</li>
            <li>✓ Free changes up to 48h before</li>
          </ul>
          <p className="text-center text-xs text-slate-500">By booking you agree to our <Link href="/terms" className="font-semibold text-brand-green-700 hover:underline">Terms</Link> and <Link href="/privacy" className="font-semibold text-brand-green-700 hover:underline">Privacy Policy</Link>. Change or cancel free up to 48 hours before.</p>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</span>
      {children}
    </label>
  );
}
