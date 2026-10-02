"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2, CheckCircle2, Phone, ShieldCheck, CalendarCheck,
  Sparkles, Landmark, XCircle, CreditCard, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopyRow } from "@/components/shared/CopyRow";
import { BANK_DETAILS, BANK_DETAILS_CONFIGURED } from "@/lib/deposit";

const PHONE_DISPLAY = "0333 000 0000";
const PHONE_TEL = "03330000000";

const gbp0 = (n: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(n || 0);
const gbp = (n: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n || 0);

interface QuoteData {
  reference: string;
  serviceLabel: string;
  firstName: string;
  total: number;
  deposit: number;
  depositPercentage: number;
  depositStatus: string;
  status: string;
  hasQuote: boolean;
}

type Stage = "loading" | "reveal" | "reserving" | "deposit" | "claiming" | "done" | "error";

export default function QuotePage() {
  const params = useParams();
  const bookingId = params.bookingId as string;
  const token = params.token as string;

  const [stage, setStage] = useState<Stage>("loading");
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/quote/details", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingId, token }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok || !data.success) { setError(data.error || "We couldn't load your quote."); setStage("error"); return; }
        setQuote(data);

        const search = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
        const justPaid = search.get("paid") === "1";
        if (justPaid || data.depositStatus === "claimed" || data.depositStatus === "verified" || data.status === "booking_confirmed" || data.status === "job_completed" || data.status === "paid") {
          setStage("done");
        } else if (data.status === "deposit_invoice_sent") {
          setStage("deposit");
        } else if (!data.hasQuote) {
          setError("quote-pending"); setStage("error");
        } else {
          setStage("reveal");
        }
      } catch {
        if (!cancelled) { setError("Network error. Please try again."); setStage("error"); }
      }
    })();
    return () => { cancelled = true; };
  }, [bookingId, token]);

  const reserve = async () => {
    setStage("reserving");
    try {
      const res = await fetch("/api/quote/reserve", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, token }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) { setError(data.error || "Couldn't reserve your date."); setStage("error"); return; }
      setStage("deposit");
    } catch {
      setError("Network error. Please try again."); setStage("error");
    }
  };

  const claimDeposit = async () => {
    setStage("claiming");
    try {
      const res = await fetch("/api/deposit/claim", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, token }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) { setError(data.error || "Something went wrong."); setStage("error"); return; }
      setStage("done");
    } catch {
      setError("Network error. Please try again."); setStage("error");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-teal-50 via-white to-brand-sky-50 px-4 py-10 sm:py-16">
      <div className="mx-auto w-full max-w-xl">
        <AnimatePresence mode="wait">
          {(stage === "loading" || stage === "reserving" || stage === "claiming") && (
            <LoadingView key="loading" stage={stage} />
          )}
          {stage === "reveal" && quote && <RevealView key="reveal" quote={quote} onReserve={reserve} />}
          {stage === "deposit" && quote && (
            <DepositView
              key="deposit" bookingId={bookingId} token={token}
              reference={quote.reference} deposit={quote.deposit}
              onClaim={claimDeposit} onError={(m) => { setError(m); setStage("error"); }}
            />
          )}
          {stage === "done" && quote && <DoneView key="done" firstName={quote.firstName} reference={quote.reference} />}
          {stage === "error" && <ErrorView key="error" pending={error === "quote-pending"} message={error} />}
        </AnimatePresence>
      </div>
    </div>
  );
}

function LoadingView({ stage }: { stage: Stage }) {
  const message = stage === "reserving" ? "Securing your date…" : stage === "claiming" ? "Confirming your payment…" : "Loading your quote…";
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center py-24 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-brand-teal-700 shadow-xl shadow-brand-teal-200">
        <Sparkles className="h-9 w-9 text-white" />
      </div>
      <p className="flex items-center gap-2 text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> {message}</p>
    </motion.div>
  );
}

function RevealView({ quote, onReserve }: { quote: QuoteData; onReserve: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-teal-100">
          <Sparkles className="h-7 w-7 text-brand-teal-700" />
        </div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-brand-teal-950">Your quote is ready, {quote.firstName}</h1>
        <p className="mt-2 text-slate-500">Fixed price, no hidden fees. Pay a small deposit today to secure your date.</p>
      </div>

      <div className="rounded-2xl border-2 border-brand-teal-200 bg-white p-5 shadow-xl shadow-slate-200/60 sm:p-6">
        <h2 className="font-display text-lg font-extrabold text-brand-teal-950">{quote.serviceLabel}</h2>
        <div className="mt-5 border-t border-dashed border-slate-200 pt-5">
          <div className="flex items-end justify-between">
            <span className="font-display text-lg font-bold text-brand-teal-950">Total</span>
            <span className="font-display text-3xl font-extrabold tabular-nums text-brand-teal-900">{gbp(quote.total)}</span>
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-brand-sky-100 px-4 py-3 text-sm text-brand-sky-800">
            <CalendarCheck className="h-5 w-5 shrink-0" />
            <span>Secure your date with just a <strong>{quote.depositPercentage}% deposit of {gbp(quote.deposit)}</strong> — the rest isn&apos;t due until the job&apos;s done.</span>
          </div>
          <Button onClick={onReserve} size="lg" className="mt-4 h-14 w-full rounded-xl bg-brand-teal-700 text-base font-bold text-white shadow-lg shadow-brand-teal-200 hover:bg-brand-teal-800">
            Pay {gbp0(quote.deposit)} deposit to secure your date
          </Button>
        </div>
      </div>

      <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-slate-400">
        <ShieldCheck className="h-4 w-4" /> Secure payment · The rest isn&apos;t due until the job&apos;s done
      </p>
    </motion.div>
  );
}

function DepositView({
  bookingId, token, reference, deposit, onClaim, onError,
}: {
  bookingId: string; token: string; reference: string; deposit: number;
  onClaim: () => void; onError: (message: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [showBank, setShowBank] = useState(false);

  const startCheckout = async () => {
    setBusy(true);
    try {
      const isTest = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("test") === "1";
      const res = await fetch(`/api/quote/${bookingId}/pay${isTest ? "?test=1" : ""}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok || !data.success || !data.url) throw new Error(data.error || "Couldn't start payment.");
      window.location.href = data.url as string;
    } catch (e) {
      setBusy(false);
      onError(e instanceof Error ? e.message : "Couldn't start payment.");
    }
  };

  const rows = [
    { label: "Account name", value: BANK_DETAILS.accountName },
    { label: "Sort code", value: BANK_DETAILS.sortCode },
    { label: "Account number", value: BANK_DETAILS.accountNumber },
    { label: "Payment reference", value: reference },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-teal-100">
          <ShieldCheck className="h-7 w-7 text-brand-teal-800" />
        </div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-brand-teal-950">Secure your date</h1>
        <p className="mt-2 text-slate-500">Choose how you&apos;d like to pay — your date is held as soon as you do.</p>
      </div>

      <div className="space-y-3">
        <button type="button" onClick={startCheckout} disabled={busy} className="flex w-full items-center gap-3 rounded-2xl border-2 border-brand-teal-200 bg-white p-4 text-left shadow-sm transition-colors hover:border-brand-teal-400 disabled:opacity-60">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-teal-100 text-brand-teal-800">
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <CreditCard className="h-5 w-5" />}
          </span>
          <span className="flex-1">
            <span className="block font-display text-base font-bold text-brand-teal-950">Pay deposit by card</span>
            <span className="block text-sm text-slate-500">Secure your date now with {gbp(deposit)}.</span>
          </span>
          <span className="font-display text-lg font-extrabold tabular-nums text-brand-teal-900">{gbp0(deposit)}</span>
        </button>

        <button type="button" onClick={() => setShowBank((s) => !s)} disabled={busy} className="flex w-full items-center gap-3 rounded-2xl border-2 border-slate-200 bg-white p-4 text-left shadow-sm transition-colors hover:border-slate-300 disabled:opacity-60">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
            <Landmark className="h-5 w-5" />
          </span>
          <span className="flex-1">
            <span className="block font-display text-base font-bold text-brand-teal-950">Pay deposit by bank transfer</span>
            <span className="block text-sm text-slate-500">Send {gbp(deposit)} manually — no card fee.</span>
          </span>
          <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform ${showBank ? "rotate-180" : ""}`} />
        </button>
      </div>

      <AnimatePresence>
        {showBank && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              {BANK_DETAILS_CONFIGURED ? (
                <dl className="divide-y divide-slate-100">{rows.map((r) => <CopyRow key={r.label} label={r.label} value={r.value} />)}</dl>
              ) : (
                <p className="text-sm text-slate-500">Please call us on <a href={`tel:${PHONE_TEL}`} className="font-semibold text-brand-teal-800">{PHONE_DISPLAY}</a> to pay your deposit.</p>
              )}
              <div className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Use <strong>{reference}</strong> as your payment reference so we can match your transfer.
              </div>
              <Button onClick={onClaim} size="lg" className="mt-4 h-14 w-full rounded-xl bg-brand-teal-800 text-base font-bold text-white shadow-lg shadow-brand-teal-200 hover:bg-brand-teal-900">
                I&apos;ve made the bank transfer
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-slate-400">
        <ShieldCheck className="h-4 w-4" /> Secure payment · Card handled by Stripe
      </p>
    </motion.div>
  );
}

function DoneView({ firstName, reference }: { firstName: string; reference: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="text-center">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.1 }} className="mx-auto mb-6 mt-8 flex h-20 w-20 items-center justify-center rounded-full bg-brand-teal-100">
        <CheckCircle2 className="h-12 w-12 text-brand-teal-600" />
      </motion.div>
      <h1 className="font-display text-3xl font-extrabold tracking-tight text-brand-teal-950">Thank you, {firstName}!</h1>
      <p className="mx-auto mt-3 max-w-md text-slate-500">We&apos;ve got it — a member of our team will be in touch to confirm the final details.</p>
      <div className="mx-auto mt-8 max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
        <p className="text-sm text-slate-500">Your booking reference</p>
        <p className="mt-1 font-display text-2xl font-extrabold text-brand-teal-900">{reference}</p>
        <a href={`tel:${PHONE_TEL}`} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-teal-700 px-5 py-3 font-semibold text-white transition-colors hover:bg-brand-teal-800">
          <Phone className="h-4 w-4" /> Need us sooner? Call {PHONE_DISPLAY}
        </a>
      </div>
    </motion.div>
  );
}

function ErrorView({ pending, message }: { pending: boolean; message: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="text-center">
      <div className={`mx-auto mb-6 mt-8 flex h-16 w-16 items-center justify-center rounded-full ${pending ? "bg-brand-teal-100" : "bg-red-100"}`}>
        {pending ? <CalendarCheck className="h-8 w-8 text-brand-teal-800" /> : <XCircle className="h-8 w-8 text-red-600" />}
      </div>
      <h1 className="font-display text-2xl font-extrabold text-brand-teal-950">{pending ? "We're preparing your quote" : "Something went wrong"}</h1>
      <p className="mx-auto mt-3 max-w-md text-slate-500">
        {pending ? "Thanks for your request — a member of our team will be in touch very shortly with your personalised quote." : message || "Please try again, or give us a call and we'll sort it out."}
      </p>
      <a href={`tel:${PHONE_TEL}`} className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl border-2 border-brand-teal-200 px-5 py-3 font-semibold text-brand-teal-800 transition-colors hover:bg-brand-teal-50">
        <Phone className="h-4 w-4" /> Call us on {PHONE_DISPLAY}
      </a>
    </motion.div>
  );
}
