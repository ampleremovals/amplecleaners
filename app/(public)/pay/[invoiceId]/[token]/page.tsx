"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, CheckCircle2, Phone, ShieldCheck, Landmark, XCircle, CreditCard, ChevronDown, FileText, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopyRow } from "@/components/shared/CopyRow";
import { BANK_DETAILS, BANK_DETAILS_CONFIGURED } from "@/lib/deposit";
import { formatCurrency, formatDate } from "@/lib/utils";

const PHONE_DISPLAY = "0333 000 0000";
const PHONE_TEL = "03330000000";

interface InvoiceData {
  invoiceNumber: string;
  type: string;
  status: "draft" | "sent" | "paid" | "cancelled";
  total: number;
  dueDate: string | null;
  paidAt: string | null;
  firstName: string;
  reference: string;
  serviceLabel: string;
  cleanDate: string | null;
}

type Stage = "loading" | "pay" | "claimed" | "paid" | "error";

export default function PayInvoicePage() {
  const params = useParams();
  const invoiceId = params.invoiceId as string;
  const token = params.token as string;

  const [stage, setStage] = useState<Stage>("loading");
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showBank, setShowBank] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/invoices/details", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ invoiceId, token }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok || !data.success) { setError(data.error || "We couldn't load your invoice."); setStage("error"); return; }
        setInvoice(data);
        const justPaid = new URLSearchParams(window.location.search).get("paid") === "1";
        setStage(data.status === "paid" || justPaid ? "paid" : data.status === "cancelled" ? "error" : "pay");
        if (data.status === "cancelled") setError("This invoice was cancelled.");
      } catch {
        if (!cancelled) { setError("Network error. Please try again."); setStage("error"); }
      }
    })();
    return () => { cancelled = true; };
  }, [invoiceId, token]);

  const payByCard = async () => {
    setBusy(true);
    try {
      const isTest = new URLSearchParams(window.location.search).get("test") === "1";
      const res = await fetch(`/api/invoices/${invoiceId}/pay${isTest ? "?test=1" : ""}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok || !data.success || !data.url) throw new Error(data.error || "Couldn't start payment.");
      window.location.href = data.url as string;
    } catch (e) {
      setBusy(false);
      setError(e instanceof Error ? e.message : "Couldn't start payment.");
      setStage("error");
    }
  };

  const claimTransfer = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/claim`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Something went wrong.");
      setStage(data.alreadyPaid ? "paid" : "claimed");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setStage("error");
    } finally {
      setBusy(false);
    }
  };

  const pdfHref = `/api/invoices/${invoiceId}/pdf?token=${token}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-green-50 via-white to-brand-sky-50 px-4 py-10 sm:py-16">
      <div className="mx-auto w-full max-w-xl">
        <AnimatePresence mode="wait">
          {stage === "loading" && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center py-24 text-center">
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-brand-green-700 shadow-xl shadow-brand-green-200"><Sparkles className="h-9 w-9 text-white" /></div>
              <p className="flex items-center gap-2 text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading your invoice…</p>
            </motion.div>
          )}

          {stage === "pay" && invoice && (
            <motion.div key="pay" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="mb-6 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-green-100"><Sparkles className="h-7 w-7 text-brand-green-700" /></div>
                <h1 className="font-display text-3xl font-extrabold tracking-tight text-brand-green-950">Thanks, {invoice.firstName}</h1>
                <p className="mt-2 text-slate-500">Your {invoice.serviceLabel.toLowerCase()} is complete. Here&apos;s your invoice.</p>
              </div>

              <div className="rounded-2xl border-2 border-brand-green-200 bg-white p-5 shadow-xl shadow-slate-200/60 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-lg font-extrabold text-brand-green-950">{invoice.invoiceNumber}</h2>
                    <p className="text-sm text-slate-500">
                      {invoice.cleanDate ? `Clean on ${formatDate(invoice.cleanDate)} · ` : ""}Ref {invoice.reference}
                    </p>
                  </div>
                  <a href={pdfHref} target="_blank" rel="noreferrer" className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                    <FileText className="h-4 w-4" /> PDF
                  </a>
                </div>
                <div className="mt-5 flex items-end justify-between border-t border-dashed border-slate-200 pt-5">
                  <span className="font-display text-lg font-bold text-brand-green-950">Amount due</span>
                  <span className="font-display text-3xl font-extrabold tabular-nums text-brand-green-900">{formatCurrency(invoice.total)}</span>
                </div>
                {invoice.dueDate && <p className="mt-1 text-right text-xs text-slate-500">Due {formatDate(invoice.dueDate)}</p>}
              </div>

              <div className="mt-4 space-y-3">
                <button type="button" onClick={payByCard} disabled={busy} className="flex w-full items-center gap-3 rounded-2xl border-2 border-brand-green-200 bg-white p-4 text-left shadow-sm transition-colors hover:border-brand-green-400 disabled:opacity-60">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-green-100 text-brand-green-800">
                    {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <CreditCard className="h-5 w-5" />}
                  </span>
                  <span className="flex-1">
                    <span className="block font-display text-base font-bold text-brand-green-950">Pay by card</span>
                    <span className="block text-sm text-slate-500">Instant and secure.</span>
                  </span>
                </button>
                <button type="button" onClick={() => setShowBank((s) => !s)} disabled={busy} className="flex w-full items-center gap-3 rounded-2xl border-2 border-slate-200 bg-white p-4 text-left shadow-sm transition-colors hover:border-slate-300 disabled:opacity-60">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600"><Landmark className="h-5 w-5" /></span>
                  <span className="flex-1">
                    <span className="block font-display text-base font-bold text-brand-green-950">Pay by bank transfer</span>
                    <span className="block text-sm text-slate-500">No card fee.</span>
                  </span>
                  <ChevronDown className={`h-5 w-5 text-slate-500 transition-transform ${showBank ? "rotate-180" : ""}`} />
                </button>
              </div>

              <AnimatePresence>
                {showBank && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      {BANK_DETAILS_CONFIGURED ? (
                        <dl className="divide-y divide-slate-100">
                          <CopyRow label="Account name" value={BANK_DETAILS.accountName} />
                          <CopyRow label="Sort code" value={BANK_DETAILS.sortCode} />
                          <CopyRow label="Account number" value={BANK_DETAILS.accountNumber} />
                          <CopyRow label="Payment reference" value={invoice.invoiceNumber} />
                        </dl>
                      ) : (
                        <p className="text-sm text-slate-500">Please call us on <a href={`tel:${PHONE_TEL}`} className="font-semibold text-brand-green-800">{PHONE_DISPLAY}</a> for our bank details.</p>
                      )}
                      <div className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">Use <strong>{invoice.invoiceNumber}</strong> as your payment reference so we can match it.</div>
                      <Button onClick={claimTransfer} disabled={busy} size="lg" className="mt-4 h-14 w-full rounded-xl bg-brand-green-800 text-base font-bold text-white hover:bg-brand-green-900">
                        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : "I've made the bank transfer"}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-slate-500"><ShieldCheck className="h-4 w-4" /> Secure payment · Card handled by Stripe</p>
            </motion.div>
          )}

          {(stage === "paid" || stage === "claimed") && (
            <motion.div key="done" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="text-center">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.1 }} className="mx-auto mb-6 mt-8 flex h-20 w-20 items-center justify-center rounded-full bg-brand-green-100">
                <CheckCircle2 className="h-12 w-12 text-brand-green-600" />
              </motion.div>
              <h1 className="font-display text-3xl font-extrabold tracking-tight text-brand-green-950">
                {stage === "paid" ? "All paid — thank you!" : "Thanks — we're checking it"}
              </h1>
              <p className="mx-auto mt-3 max-w-md text-slate-500">
                {stage === "paid"
                  ? "We've received your payment. You'll get a receipt by email shortly."
                  : "We'll confirm your bank transfer as soon as it lands — usually within a working day."}
              </p>
              {invoice && (
                <div className="mx-auto mt-8 max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
                  <p className="text-sm text-slate-500">Invoice</p>
                  <p className="mt-1 font-display text-2xl font-extrabold text-brand-green-900">{invoice.invoiceNumber}</p>
                  <a href={pdfHref} target="_blank" rel="noreferrer" className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-brand-green-200 px-5 py-3 font-semibold text-brand-green-800 hover:bg-brand-green-50"><FileText className="h-4 w-4" /> Download PDF</a>
                </div>
              )}
            </motion.div>
          )}

          {stage === "error" && (
            <motion.div key="error" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="text-center">
              <div className="mx-auto mb-6 mt-8 flex h-16 w-16 items-center justify-center rounded-full bg-red-100"><XCircle className="h-8 w-8 text-red-600" /></div>
              <h1 className="font-display text-2xl font-extrabold text-brand-green-950">Something went wrong</h1>
              <p className="mx-auto mt-3 max-w-md text-slate-500">{error || "Please try again, or give us a call and we'll sort it out."}</p>
              <a href={`tel:${PHONE_TEL}`} className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl border-2 border-brand-green-200 px-5 py-3 font-semibold text-brand-green-800 hover:bg-brand-green-50"><Phone className="h-4 w-4" /> Call us on {PHONE_DISPLAY}</a>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
