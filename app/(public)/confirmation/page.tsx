"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, CheckCircle2, Phone } from "lucide-react";
import { Steps } from "@/components/booking/Steps";

function ConfirmationContent() {
  const params = useSearchParams();
  const ref = params.get("ref");
  const totalParam = params.get("total");
  const total = totalParam ? Number(totalParam) : null;
  // Only same-site quote paths are accepted, so this can't be turned into an open redirect.
  const payParam = params.get("pay");
  const payPath = payParam && /^\/quote\/[0-9a-f-]{36}\/[\w.-]+$/i.test(payParam) ? payParam : null;
  return (
    <div className="mx-auto max-w-lg">
      {/* "All set" is only true once the deposit is paid, which happens after this page — so the customer is always on step 2 here. */}
      <div className="flex justify-center"><Steps current={2} /></div>

      <div className="mt-8 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-brand-green-100 ring-8 ring-brand-green-50">
          <CheckCircle2 className="h-9 w-9 text-brand-green-700" />
        </div>
        <h1 className="text-balance font-display text-[1.7rem] font-bold leading-tight tracking-tight text-slate-900 sm:text-3xl">
          {total != null ? "One step left — lock in your date" : "Got it — your fixed price is on its way"}
        </h1>
        <p className="mt-3 text-base text-slate-600">
          {total != null
            ? "Your price is fixed and we've sent it to your email, SMS and WhatsApp. Your slot is held the moment you pay your small deposit — and it comes off your total."
            : "We'll send your quote by email, SMS and WhatsApp shortly. No obligation, no pressure — and the price we quote is the price you pay."}
        </p>
      </div>

      {(ref || total != null) && (
        <div className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          {total != null && (
            <div className="p-6 text-center">
              <p className="text-xs font-bold text-slate-500">Your fixed price</p>
              <p className="mt-1 font-display text-4xl font-bold tabular-nums tracking-tight text-slate-900">
                {new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(total)}
              </p>
            </div>
          )}
          {ref && (
            <div className={`bg-slate-50 px-6 py-4 text-center ${total != null ? "border-t border-slate-200" : "py-6"}`}>
              <p className="text-xs font-bold text-slate-500">Your booking reference</p>
              <p className="mt-1 font-display text-xl font-bold tracking-tight text-slate-900">{ref}</p>
            </div>
          )}
        </div>
      )}

      {payPath && (
        <>
          <a href={payPath} className="group mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-green-700 px-5 py-4 font-display text-[0.95rem] font-bold text-white shadow-lg shadow-brand-green-700/25 transition hover:bg-brand-green-800">
            Pay deposit to secure my date <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </a>
          <p className="mt-3 text-center text-xs font-medium text-slate-600">Free changes and cancellations up to 48 hours before your clean.</p>
        </>
      )}
      <div className="mt-6 text-center">
        <a href="tel:03330000000" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition-colors hover:border-brand-green-400 hover:bg-brand-green-50">
          <Phone className="h-4 w-4" /> Questions? Call 0333 000 0000
        </a>
      </div>
    </div>
  );
}

export default function ConfirmationPage() {
  return (
    <div className="bg-slate-50 px-4 py-12 sm:py-20">
      <Suspense fallback={null}>
        <ConfirmationContent />
      </Suspense>
    </div>
  );
}
