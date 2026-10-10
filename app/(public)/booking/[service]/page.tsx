"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowRight, BadgeCheck, CalendarClock, Loader2, Lock, Minus, Plus, ShieldCheck, Wallet } from "lucide-react";
import { SERVICE_LABELS, type ServiceType } from "@/types";
import { Steps } from "@/components/booking/Steps";
import { REMINDER_NOTICE } from "@/lib/email/notice";
import { usePricing } from "@/components/shared/PricingProvider";
import { readAttribution } from "@/components/shared/attribution";

const VALID_SERVICES = Object.keys(SERVICE_LABELS) as ServiceType[];
const gbp = (n: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n);

const INPUT = "h-12 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-[15px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-green-600 focus:ring-4 focus:ring-brand-green-100";

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
  const total = price(form.hours);
  const deposit = Math.round(total * depositPercentage) / 100;
  const balance = Math.round((total - deposit) * 100) / 100;

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  // Once the visitor has given a name and a valid email, tell the server so a reminder can follow if they never finish.
  const lastCaptured = useRef("");
  const captureLead = () => {
    const email = form.email.trim().toLowerCase();
    if (!form.fullName.trim() || !/^[^s@]+@[^s@]+.[^s@]{2,}$/.test(email) || lastCaptured.current === email) return;
    lastCaptured.current = email;
    void fetch("/api/leads/capture", {
      method: "POST", headers: { "Content-Type": "application/json" }, keepalive: true,
      body: JSON.stringify({ email, fullName: form.fullName.trim(), phone: form.phone.trim(), serviceType }),
    }).catch(() => undefined);
  };

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

  // The phone price bar steps aside while the form's own submit button is on screen, so there is never a double button.
  const submitRef = useRef<HTMLButtonElement>(null);
  const [submitVisible, setSubmitVisible] = useState(false);
  useEffect(() => {
    const el = submitRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return undefined;
    const io = new IntersectionObserver(([e]) => setSubmitVisible(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const label = isRegular ? "Get my price & secure my slot" : "Get my fixed price";

  return (
    <div className="bg-slate-50 px-4 pb-28 pt-8 sm:pt-12 lg:pb-16">
      <div className="mx-auto w-full max-w-5xl">
        <Steps current={1} />
        <h1 className="mt-6 max-w-2xl text-balance font-display text-[1.7rem] font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl">
          {isRegular ? "See your exact price in 2 minutes" : `Get your fixed price for ${SERVICE_LABELS[serviceType].toLowerCase()}`}
        </h1>
        <p className="mt-3 max-w-2xl text-base text-slate-600 sm:text-lg">
          {isRegular ? "Choose your hours and tell us where — your total appears instantly. No card needed, no obligation." : "Tell us about the property and we'll send a fixed price. No card needed, no obligation, no pressure."}
        </p>

        <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-10">
          <form id="booking-form" onSubmit={handleSubmit} className="min-w-0 space-y-5">
            <Section n={1} title="Your details">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Full name">
                  <input required autoComplete="name" value={form.fullName} onChange={(e) => set("fullName", e.target.value)} className={INPUT} />
                </Field>
                <Field label="Phone">
                  <input required type="tel" autoComplete="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} className={INPUT} placeholder="07…" />
                </Field>
              </div>
              <Field label="Email">
                <input required type="email" autoComplete="email" value={form.email} onChange={(e) => set("email", e.target.value)} onBlur={captureLead} className={INPUT} />
              </Field>
              <p className="text-xs leading-relaxed text-slate-500">{REMINDER_NOTICE}</p>
            </Section>

            <Section n={2} title={isRegular ? "Your home and your clean" : "Your property"}>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Property type">
                  <select value={form.propertyType} onChange={(e) => set("propertyType", e.target.value as typeof form.propertyType)} className={INPUT}>
                    <option value="flat">Flat</option>
                    <option value="house">House</option>
                    <option value="studio">Studio</option>
                    <option value="office">Office</option>
                    <option value="other">Other</option>
                  </select>
                </Field>
                <Field label="Bedrooms">
                  <input type="number" inputMode="numeric" min={0} max={10} value={form.bedrooms} onChange={(e) => set("bedrooms", Number(e.target.value))} className={INPUT} />
                </Field>
                <Field label="Bathrooms">
                  <input type="number" inputMode="numeric" min={0} max={10} value={form.bathrooms} onChange={(e) => set("bathrooms", Number(e.target.value))} className={INPUT} />
                </Field>
              </div>

              {isRegular && (
                <>
                  <Field label="How often?">
                    <select value={form.frequency} onChange={(e) => set("frequency", e.target.value as typeof form.frequency)} className={INPUT}>
                      <option value="weekly">Weekly</option>
                      <option value="fortnightly">Fortnightly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </Field>

                  <div>
                    <span className="mb-1.5 block text-sm font-semibold text-slate-700" id="hours-label">How many hours? ({gbp(hourlyRate)} an hour, {minHours} hours minimum)</span>
                    <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-100 p-1.5" role="group" aria-labelledby="hours-label">
                      <button
                        type="button"
                        onClick={() => set("hours", Math.max(minHours, form.hours - 1))}
                        disabled={form.hours <= minHours}
                        aria-label="One hour less"
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-slate-900 shadow-sm transition active:scale-95 enabled:hover:text-brand-green-700 disabled:opacity-40"
                      >
                        <Minus className="h-5 w-5" />
                      </button>
                      <div className="text-center" aria-live="polite">
                        <span className="font-display text-2xl font-bold tabular-nums text-slate-900">{form.hours}</span>
                        <span className="ml-1.5 text-sm font-semibold text-slate-600">{form.hours === 1 ? "hour" : "hours"}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => set("hours", form.hours + 1)}
                        aria-label="One hour more"
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-slate-900 shadow-sm transition active:scale-95 enabled:hover:text-brand-green-700"
                      >
                        <Plus className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  {/* Visible on phones, where the summary card is hidden. */}
                  <div className="flex items-center justify-between rounded-2xl bg-brand-green-50 px-5 py-4 lg:hidden">
                    <span className="text-sm font-semibold text-brand-green-900">Your fixed price</span>
                    <span className="text-right">
                      <span className="block font-display text-2xl font-bold tabular-nums text-brand-green-900">{gbp(total)}</span>
                      <span className="block text-xs font-semibold text-brand-green-900">Secure your date for just {gbp(deposit)}</span>
                    </span>
                  </div>
                </>
              )}
            </Section>

            <Section n={3} title="Where and when">
              <Field label="Address line 1">
                <input required autoComplete="address-line1" value={form.line1} onChange={(e) => set("line1", e.target.value)} className={INPUT} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Town / city">
                  <input autoComplete="address-level2" value={form.city} onChange={(e) => set("city", e.target.value)} className={INPUT} />
                </Field>
                <Field label="Postcode">
                  <input required autoComplete="postal-code" value={form.postcode} onChange={(e) => set("postcode", e.target.value)} className={INPUT} />
                </Field>
              </div>

              <label htmlFor="flex" className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                <input
                  id="flex"
                  type="checkbox"
                  checked={form.isFlexibleDate}
                  onChange={(e) => set("isFlexibleDate", e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 accent-brand-green-700"
                />
                My date is flexible
              </label>
              {!form.isFlexibleDate && (
                <Field label="Preferred date">
                  <input type="date" value={form.cleanDate} onChange={(e) => set("cleanDate", e.target.value)} className={INPUT} />
                </Field>
              )}

              <Field label="Anything else we should know? (optional)">
                <textarea
                  value={form.specialInstructions}
                  onChange={(e) => set("specialInstructions", e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-[15px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-green-600 focus:ring-4 focus:ring-brand-green-100"
                />
              </Field>
            </Section>

            {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}

            <button
              ref={submitRef}
              type="submit"
              disabled={submitting}
              className="group flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-brand-green-700 font-display text-[0.95rem] font-bold text-white shadow-lg shadow-brand-green-700/25 transition hover:bg-brand-green-800 disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
              {label}
              {!submitting && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />}
            </button>
            <p className="flex items-center justify-center gap-1.5 text-center text-xs text-slate-500">
              <Lock className="h-3.5 w-3.5" aria-hidden /> By booking you agree to our <Link href="/terms" className="font-semibold text-brand-green-700 hover:underline">Terms</Link> and <Link href="/privacy" className="font-semibold text-brand-green-700 hover:underline">Privacy Policy</Link>.
            </p>
          </form>

          {/* Summary: sticky beside the form on desktop. */}
          <aside className="hidden lg:sticky lg:top-28 lg:block" aria-label="Your booking summary">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_20px_50px_-25px_rgba(15,23,42,0.35)]">
              <p className="text-xs font-bold text-slate-500">Your booking</p>
              <p className="mt-1 font-display text-lg font-bold text-slate-900">{SERVICE_LABELS[serviceType]}</p>
              {isRegular ? (
                <>
                  <p className="mt-5 text-xs font-bold text-slate-500">Your fixed price</p>
                  <p className="font-display text-4xl font-bold leading-none tracking-tight tabular-nums text-slate-900">{gbp(total)}</p>
                  <p className="mt-1.5 text-sm text-slate-600">{form.hours} hours at {gbp(hourlyRate)} an hour</p>
                  <dl className="mt-5 space-y-2 rounded-2xl bg-brand-green-50 p-4 text-sm">
                    <div className="flex items-center justify-between gap-3"><dt className="font-semibold text-brand-green-900">To lock in your date ({depositPercentage}%)</dt><dd className="font-display font-bold tabular-nums text-brand-green-900">{gbp(deposit)}</dd></div>
                    <div className="flex items-center justify-between gap-3"><dt className="text-slate-700">Balance, after the clean</dt><dd className="font-semibold tabular-nums text-slate-900">{gbp(balance)}</dd></div>
                  </dl>
                </>
              ) : (
                <ol className="mt-5 space-y-3 text-sm text-slate-700">
                  {["Tell us about the property", "We send your fixed price by email, SMS and WhatsApp", `Pay ${depositPercentage}% to secure your date`].map((t, i) => (
                    <li key={t} className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-green-100 text-xs font-bold text-brand-green-900">{i + 1}</span>{t}</li>
                  ))}
                </ol>
              )}
              <ul className="mt-5 space-y-3 border-t border-slate-100 pt-5 text-sm text-slate-700">
                <li className="flex items-center gap-2.5"><ShieldCheck className="h-4 w-4 shrink-0 text-brand-green-700" /> DBS-checked and fully insured</li>
                <li className="flex items-center gap-2.5"><BadgeCheck className="h-4 w-4 shrink-0 text-brand-green-700" /> Price never changes on the day</li>
                <li className="flex items-center gap-2.5"><Wallet className="h-4 w-4 shrink-0 text-brand-green-700" /> Deposit comes off your total</li>
                <li className="flex items-center gap-2.5"><CalendarClock className="h-4 w-4 shrink-0 text-brand-green-700" /> Free changes up to 48h before</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>

      {/* Phones: live price + submit, shown only while the form's own button is off screen. */}
      <div
        aria-hidden={submitVisible}
        className={`fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 pt-3 shadow-[0_-10px_30px_-12px_rgba(15,23,42,0.25)] backdrop-blur transition-transform duration-300 lg:hidden pb-[max(0.75rem,env(safe-area-inset-bottom))] ${submitVisible ? "pointer-events-none translate-y-full" : "translate-y-0"}`}
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm leading-tight text-slate-600">
            {isRegular ? (<><span className="block font-display text-base font-bold text-slate-900">{gbp(total)}</span>{gbp(deposit)} to book</>) : (<span className="font-semibold text-slate-900">Fixed price quote</span>)}
          </p>
          <button
            type="submit"
            form="booking-form"
            disabled={submitting}
            tabIndex={submitVisible ? -1 : 0}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-brand-green-700 px-5 py-3 font-display text-sm font-bold text-white shadow-md active:scale-95 disabled:opacity-60"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />} {isRegular ? "Book now" : "Get my price"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <h2 className="flex items-center gap-3 font-display text-base font-bold text-slate-900">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white" aria-hidden>{n}</span>
        {title}
      </h2>
      <div className="mt-5 space-y-4">{children}</div>
    </section>
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
