"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { CalendarDays, CheckCircle2, Loader2, MapPin, Phone, Repeat, Sparkles, User, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

const PHONE_DISPLAY = "0333 000 0000";
const PHONE_TEL = "03330000000";

interface Details {
  reference: string; status: string; serviceLabel: string; cleanDate: string | null; cleanTime: string | null;
  address: string | null; firstName: string; cleanerFirstName: string | null; frequency: string | null; isVisitInSeries: boolean;
  changeable: boolean; withinFreeWindow: boolean; freeChangeHours: number; bounds: { min: string; max: string };
}
type Mode = "view" | "reschedule" | "cancel" | "series";
type Outcome = { kind: "rescheduled" | "cancelled" | "stopped"; refund: boolean } | null;

const post = async (path: string, body: unknown) => {
  const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) throw new Error(json.error || "Something went wrong.");
  return json;
};

export default function ManageBookingPage() {
  const params = useParams();
  const bookingId = params.bookingId as string;
  const token = params.token as string;

  const [d, setD] = useState<Details | null>(null);
  const [loadError, setLoadError] = useState("");
  const [mode, setMode] = useState<Mode>("view");
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [outcome, setOutcome] = useState<Outcome>(null);

  const load = useCallback(async () => {
    try {
      const json = await post("/api/booking/manage/details", { bookingId, token });
      setD(json);
      setNewTime(json.cleanTime ?? "");
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "We couldn't load your booking.");
    }
  }, [bookingId, token]);
  useEffect(() => { load(); }, [load]);

  async function run(fn: () => Promise<Outcome>) {
    setBusy(true);
    setError("");
    try {
      setOutcome(await fn());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  const reschedule = () => run(async () => {
    await post("/api/booking/manage/reschedule", { bookingId, token, cleanDate: newDate, cleanTime: newTime || undefined });
    return { kind: "rescheduled", refund: false };
  });
  const cancel = (scope: "visit" | "series") => run(async () => {
    const json = await post("/api/booking/manage/cancel", { bookingId, token, scope, reason: reason.trim() || undefined });
    return { kind: scope === "series" ? "stopped" : "cancelled", refund: (json.refundDue ?? 0) > 0 };
  });

  const shell = (children: React.ReactNode) => (
    <div className="min-h-screen bg-gradient-to-br from-brand-green-50 via-white to-brand-sky-50 px-4 py-10 sm:py-16">
      <div className="mx-auto w-full max-w-xl">{children}</div>
    </div>
  );

  if (loadError) {
    return shell(
      <div className="text-center">
        <div className="mx-auto mb-6 mt-8 flex h-16 w-16 items-center justify-center rounded-full bg-red-100"><XCircle className="h-8 w-8 text-red-600" /></div>
        <h1 className="font-display text-2xl font-extrabold text-brand-green-950">We couldn&apos;t open this booking</h1>
        <p className="mx-auto mt-3 max-w-md text-slate-500">{loadError}</p>
        <a href={`tel:${PHONE_TEL}`} className="mt-6 inline-flex items-center gap-2 rounded-xl border-2 border-brand-green-200 px-5 py-3 font-semibold text-brand-green-800 hover:bg-brand-green-50"><Phone className="h-4 w-4" /> Call us on {PHONE_DISPLAY}</a>
      </div>,
    );
  }
  if (!d) return shell(<p className="flex items-center justify-center gap-2 py-24 text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading your booking…</p>);

  if (outcome) {
    const copy = {
      rescheduled: { title: "Your clean has moved", body: "We've updated your booking and sent you a confirmation. We'll confirm your cleaner closer to the day." },
      cancelled: { title: "Your clean is cancelled", body: "We've sent you a confirmation." },
      stopped: { title: "Your regular cleans are stopped", body: "We've cancelled your upcoming visits — you won't be charged for anything further." },
    }[outcome.kind];
    return shell(
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <div className="mx-auto mb-6 mt-8 flex h-20 w-20 items-center justify-center rounded-full bg-brand-green-100"><CheckCircle2 className="h-12 w-12 text-brand-green-600" /></div>
        <h1 className="font-display text-3xl font-extrabold text-brand-green-950">{copy.title}</h1>
        <p className="mx-auto mt-3 max-w-md text-slate-500">{copy.body}{outcome.refund ? " Your payment will be refunded — we'll be in touch shortly." : ""}</p>
        <a href="/" className="mt-8 inline-flex rounded-xl border-2 border-brand-green-200 px-5 py-3 font-semibold text-brand-green-800 hover:bg-brand-green-50">Back to Ample Cleaners</a>
      </motion.div>,
    );
  }

  const when = d.cleanDate ? `${formatDate(d.cleanDate)}${d.cleanTime ? ` at ${d.cleanTime}` : ""}` : "Flexible date";

  return shell(
    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-green-100"><Sparkles className="h-7 w-7 text-brand-green-700" /></div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-brand-green-950">Hi {d.firstName}</h1>
        <p className="mt-2 text-slate-500">Here&apos;s your booking. You can change it below.</p>
      </div>

      <div className="rounded-2xl border-2 border-brand-green-200 bg-white p-5 shadow-xl shadow-slate-200/60 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-display text-lg font-extrabold text-brand-green-950">{d.serviceLabel}</h2>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold capitalize text-slate-600">{d.status.replace(/_/g, " ")}</span>
        </div>
        <ul className="mt-4 space-y-2.5 text-sm text-slate-700">
          <li className="flex items-center gap-2.5"><CalendarDays className="h-4 w-4 shrink-0 text-brand-green-600" /> {when}</li>
          {d.address && <li className="flex items-center gap-2.5"><MapPin className="h-4 w-4 shrink-0 text-brand-green-600" /> {d.address}</li>}
          {d.cleanerFirstName && <li className="flex items-center gap-2.5"><User className="h-4 w-4 shrink-0 text-brand-green-600" /> {d.cleanerFirstName} is your cleaner</li>}
          {d.frequency && <li className="flex items-center gap-2.5"><Repeat className="h-4 w-4 shrink-0 text-brand-green-600" /> Repeats {d.frequency}</li>}
        </ul>
        <p className="mt-4 border-t border-dashed border-slate-200 pt-3 text-xs text-slate-400">Ref {d.reference}</p>
      </div>

      {!d.changeable ? (
        <p className="mt-5 rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-500">
          {d.status === "cancelled" ? "This booking has been cancelled." : "This booking can no longer be changed online."} Need help? <a href={`tel:${PHONE_TEL}`} className="font-semibold text-brand-green-800">Call {PHONE_DISPLAY}</a>
        </p>
      ) : !d.withinFreeWindow ? (
        <p className="mt-5 rounded-xl bg-amber-50 p-4 text-center text-sm text-amber-800">
          Your clean is less than {d.freeChangeHours} hours away, so we can&apos;t change it online. Please <a href={`tel:${PHONE_TEL}`} className="font-semibold underline">call us on {PHONE_DISPLAY}</a> and we&apos;ll help.
        </p>
      ) : (
        <div className="mt-5 space-y-3">
          {mode === "view" && (
            <>
              <Button onClick={() => setMode("reschedule")} size="lg" className="h-14 w-full rounded-xl bg-brand-green-700 text-base font-bold text-white hover:bg-brand-green-800">Change the date</Button>
              <button onClick={() => setMode("cancel")} className="h-12 w-full rounded-xl border-2 border-slate-200 bg-white text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel this clean</button>
              {d.frequency && <button onClick={() => setMode("series")} className="h-12 w-full rounded-xl border-2 border-slate-200 bg-white text-sm font-semibold text-slate-600 hover:bg-slate-50">Stop my regular cleans</button>}
            </>
          )}

          {mode === "reschedule" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="font-bold text-brand-green-950">Pick a new date</h3>
              <label className="mt-3 block"><span className="mb-1.5 block text-sm font-semibold text-slate-700">New date</span>
                <input type="date" min={d.bounds.min} max={d.bounds.max} value={newDate} onChange={(e) => setNewDate(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 px-3.5 text-sm outline-none focus:border-brand-green-600" /></label>
              <label className="mt-3 block"><span className="mb-1.5 block text-sm font-semibold text-slate-700">Start time (optional)</span>
                <input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 px-3.5 text-sm outline-none focus:border-brand-green-600" /></label>
              {error && <p role="alert" className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
              <div className="mt-4 flex gap-3">
                <button onClick={() => { setMode("view"); setError(""); }} disabled={busy} className="h-12 flex-1 rounded-xl border-2 border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">Back</button>
                <Button onClick={reschedule} disabled={busy || !newDate} className="h-12 flex-1 rounded-xl bg-brand-green-700 font-bold text-white hover:bg-brand-green-800">{busy ? <Loader2 className="h-5 w-5 animate-spin" /> : "Confirm new date"}</Button>
              </div>
            </div>
          )}

          {(mode === "cancel" || mode === "series") && (
            <div className="rounded-2xl border border-red-200 bg-white p-5 shadow-sm">
              <h3 className="font-bold text-red-700">{mode === "series" ? "Stop all your regular cleans?" : "Cancel this clean?"}</h3>
              <p className="mt-1 text-sm text-slate-500">{mode === "series" ? "We'll cancel every upcoming visit. You won't be charged for anything further." : "We'll let your cleaner know. If you've paid a deposit we'll refund it."}</p>
              <label className="mt-3 block"><span className="mb-1.5 block text-sm font-semibold text-slate-700">Anything you&apos;d like to tell us? (optional)</span>
                <textarea rows={2} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-green-600" /></label>
              {error && <p role="alert" className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
              <div className="mt-4 flex gap-3">
                <button onClick={() => { setMode("view"); setError(""); }} disabled={busy} className="h-12 flex-1 rounded-xl border-2 border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">Keep it</button>
                <button onClick={() => cancel(mode === "series" ? "series" : "visit")} disabled={busy} className="inline-flex h-12 flex-1 items-center justify-center rounded-xl bg-red-600 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60">{busy ? <Loader2 className="h-5 w-5 animate-spin" /> : mode === "series" ? "Stop my cleans" : "Cancel clean"}</button>
              </div>
            </div>
          )}
        </div>
      )}

      <p className="mt-6 text-center text-xs text-slate-400">Changes are free up to {d.freeChangeHours} hours before your clean.</p>
    </motion.div>,
  );
}
