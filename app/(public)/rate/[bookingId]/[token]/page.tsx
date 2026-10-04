"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, Star, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RateData { firstName: string; cleanerFirstName: string | null; serviceLabel: string; alreadyRated: boolean }
type Stage = "loading" | "form" | "submitting" | "done" | "error";

const LABELS = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];

export default function RatePage() {
  const params = useParams();
  const bookingId = params.bookingId as string;
  const token = params.token as string;

  const [stage, setStage] = useState<Stage>("loading");
  const [data, setData] = useState<RateData | null>(null);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/rate/details", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bookingId, token }) });
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok || !json.success) { setError(json.error || "We couldn't load this page."); setStage("error"); return; }
        setData(json);
        setStage(json.alreadyRated ? "done" : "form");
      } catch {
        if (!cancelled) { setError("Network error. Please try again."); setStage("error"); }
      }
    })();
    return () => { cancelled = true; };
  }, [bookingId, token]);

  const submit = async () => {
    if (!rating) return;
    setStage("submitting");
    try {
      const res = await fetch("/api/rate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bookingId, token, rating, feedback: feedback.trim() || undefined }) });
      const json = await res.json();
      if (res.status === 409 && /already rated/i.test(json.error ?? "")) { setStage("done"); return; }
      if (!res.ok || !json.success) { setError(json.error || "Couldn't save your rating."); setStage("form"); return; }
      setStage("done");
    } catch {
      setError("Network error. Please try again."); setStage("form");
    }
  };

  const shown = hover || rating;

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-green-50 via-white to-brand-sky-50 px-4 py-12 sm:py-20">
      <div className="mx-auto w-full max-w-md">
        {stage === "loading" && <p className="flex items-center justify-center gap-2 py-24 text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</p>}

        {(stage === "form" || stage === "submitting") && data && (
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-xl shadow-slate-200/60">
            <h1 className="font-display text-2xl font-extrabold text-brand-green-950">How was your clean, {data.firstName}?</h1>
            <p className="mt-2 text-sm text-slate-500">
              {data.cleanerFirstName ? `${data.cleanerFirstName} looked after your ${data.serviceLabel.toLowerCase()}.` : `Your ${data.serviceLabel.toLowerCase()}.`} Tap a star.
            </p>
            <div className="mt-5 flex justify-center gap-1" onMouseLeave={() => setHover(0)} role="radiogroup" aria-label="Rating">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} star${n > 1 ? "s" : ""}`} onClick={() => setRating(n)} onMouseEnter={() => setHover(n)} className="rounded-lg p-1.5 transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green-600">
                  <Star className={`h-10 w-10 ${n <= shown ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} />
                </button>
              ))}
            </div>
            <p className="mt-2 h-5 text-sm font-semibold text-brand-green-800">{LABELS[shown]}</p>
            <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} maxLength={1000} rows={3} placeholder={rating && rating <= 3 ? "Sorry to hear that — what went wrong?" : "Anything you'd like to add? (optional)"} className="mt-4 w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-brand-green-500 focus:outline-none focus:ring-2 focus:ring-brand-green-200" />
            {error && <p className="mt-2 text-sm font-semibold text-red-600">{error}</p>}
            <Button onClick={submit} disabled={!rating || stage === "submitting"} size="lg" className="mt-4 h-12 w-full rounded-xl bg-brand-green-700 text-base font-bold text-white hover:bg-brand-green-800">
              {stage === "submitting" ? <Loader2 className="h-5 w-5 animate-spin" /> : "Send my rating"}
            </Button>
          </motion.div>
        )}

        {stage === "done" && (
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <div className="mx-auto mb-6 mt-8 flex h-20 w-20 items-center justify-center rounded-full bg-brand-green-100"><CheckCircle2 className="h-12 w-12 text-brand-green-600" /></div>
            <h1 className="font-display text-3xl font-extrabold text-brand-green-950">Thank you!</h1>
            <p className="mx-auto mt-3 max-w-sm text-slate-500">Your feedback helps us look after you — and everyone else — better.</p>
          </motion.div>
        )}

        {stage === "error" && (
          <div className="text-center">
            <div className="mx-auto mb-6 mt-8 flex h-16 w-16 items-center justify-center rounded-full bg-red-100"><XCircle className="h-8 w-8 text-red-600" /></div>
            <h1 className="font-display text-2xl font-extrabold text-brand-green-950">Something went wrong</h1>
            <p className="mx-auto mt-3 max-w-md text-slate-500">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
