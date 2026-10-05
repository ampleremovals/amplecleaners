"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";

const inputCls = "h-11 w-full rounded-xl border border-slate-200 px-3.5 text-sm outline-none focus:border-brand-green-600";

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

export default function CleanerRegisterPage() {
  const [form, setForm] = useState({
    fullName: "", email: "", phone: "", postcode: "", areas: "", experienceYears: "",
    hasRightToWork: false, hasDbs: false, availabilityNotes: "", about: "", website: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/cleaners/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, experienceYears: form.experienceYears === "" ? undefined : Number(form.experienceYears) }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Something went wrong.");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="bg-gradient-to-br from-brand-green-50 via-white to-brand-sky-50 px-4 py-20">
        <div className="mx-auto max-w-md text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-brand-green-100"><CheckCircle2 className="h-12 w-12 text-brand-green-700" /></div>
          <h1 className="font-display text-3xl font-extrabold text-brand-green-950">Application received</h1>
          <p className="mt-3 text-slate-500">Thanks for applying to join Ample Cleaners. We&apos;ll be in touch within a few days — check your email and phone.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-brand-green-50 via-white to-brand-sky-50 px-4 py-12 sm:py-16">
      <div className="mx-auto w-full max-w-xl">
        <h1 className="font-display text-3xl font-extrabold text-brand-green-950">Clean on your terms. We bring the customers.</h1>
        <p className="mt-2 text-slate-500">You choose your hours and your areas. We find the customers, match you to jobs near you and handle the booking — you just turn up and do what you do best. Tell us about yourself in two minutes.</p>

        <form onSubmit={submit} className="mt-8 space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name"><input required className={inputCls} value={form.fullName} onChange={(e) => set("fullName", e.target.value)} autoComplete="name" /></Field>
            <Field label="Phone"><input required className={inputCls} value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="07…" autoComplete="tel" /></Field>
          </div>
          <Field label="Email"><input required type="email" className={inputCls} value={form.email} onChange={(e) => set("email", e.target.value)} autoComplete="email" /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Your postcode"><input required className={inputCls} value={form.postcode} onChange={(e) => set("postcode", e.target.value)} autoComplete="postal-code" /></Field>
            <Field label="Years of cleaning experience"><input type="number" min={0} max={60} className={inputCls} value={form.experienceYears} onChange={(e) => set("experienceYears", e.target.value)} /></Field>
          </div>
          <Field label="Areas you can travel to" hint="Postcode areas, separated by commas — e.g. SW1, SW3, W1">
            <input className={inputCls} value={form.areas} onChange={(e) => set("areas", e.target.value)} />
          </Field>

          <div className="space-y-3 rounded-xl bg-slate-50 p-4">
            <label className="flex items-start gap-3 text-sm text-slate-700"><input type="checkbox" className="mt-0.5 h-4 w-4" checked={form.hasRightToWork} onChange={(e) => set("hasRightToWork", e.target.checked)} /> I have the right to work in the UK</label>
            <label className="flex items-start gap-3 text-sm text-slate-700"><input type="checkbox" className="mt-0.5 h-4 w-4" checked={form.hasDbs} onChange={(e) => set("hasDbs", e.target.checked)} /> I already have an enhanced DBS check (or I&apos;m happy to get one)</label>
          </div>

          <Field label="When are you available?" hint="e.g. Weekdays 9–3, some Saturdays">
            <textarea rows={2} className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-green-600" value={form.availabilityNotes} onChange={(e) => set("availabilityNotes", e.target.value)} />
          </Field>
          <Field label="Anything else we should know? (optional)">
            <textarea rows={3} className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-green-600" value={form.about} onChange={(e) => set("about", e.target.value)} />
          </Field>

          {/* Honeypot: hidden from people and assistive tech; bots fill it. */}
          <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
            <label>Website <input tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => set("website", e.target.value)} /></label>
          </div>

          {error && <p role="alert" className="text-sm font-semibold text-red-600">{error}</p>}
          <button type="submit" disabled={busy} className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-brand-green-700 text-base font-bold text-white shadow-lg shadow-brand-green-200 hover:bg-brand-green-800 disabled:opacity-60">
            {busy && <Loader2 className="h-5 w-5 animate-spin" />} Apply to join the team
          </button>
          <p className="text-center text-xs text-slate-500">We use your details only to assess your application — see our <Link href="/privacy" className="font-semibold text-brand-green-700 hover:underline">Privacy Policy</Link>.</p>
        </form>
      </div>
    </div>
  );
}
