"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Phone } from "lucide-react";

function ConfirmationContent() {
  const params = useSearchParams();
  const ref = params.get("ref");
  const totalParam = params.get("total");
  const total = totalParam ? Number(totalParam) : null;
  // Only same-site quote paths are accepted, so this can't be turned into an open redirect.
  const payParam = params.get("pay");
  const payPath = payParam && /^\/quote\/[0-9a-f-]{36}\/[\w.-]+$/i.test(payParam) ? payParam : null;
  return (
    <div className="mx-auto max-w-md text-center">
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-brand-green-100">
        <CheckCircle2 className="h-12 w-12 text-brand-green-700" />
      </div>
      <h1 className="font-display text-3xl font-extrabold text-slate-900">
        {total != null ? "One step left — lock in your date" : "Got it — your fixed price is on its way"}
      </h1>
      <p className="mt-3 text-slate-700">
        {total != null
          ? "Your price is fixed and we've sent it to your email, SMS and WhatsApp. Your slot is held the moment you pay your small deposit — and it comes off your total."
          : "We'll send your quote by email, SMS and WhatsApp shortly. No obligation, no pressure — and the price we quote is the price you pay."}
      </p>
      {(ref || total != null) && (
        <div className="mx-auto mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
          {total != null && (
            <>
              <p className="text-sm text-slate-700">Your fixed price</p>
              <p className="font-display text-3xl font-extrabold text-brand-green-700">
                {new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(total)}
              </p>
              <div className="my-4 border-t border-dashed border-slate-200" />
            </>
          )}
          {ref && (
            <>
              <p className="text-sm text-slate-700">Your booking reference</p>
              <p className="mt-1 font-display text-2xl font-extrabold text-brand-green-800">{ref}</p>
            </>
          )}
        </div>
      )}
      {payPath && (
        <a href={payPath} className="mt-8 flex w-full items-center justify-center rounded-xl bg-brand-green-700 px-5 py-4 text-base font-bold text-white shadow-lg shadow-brand-green-200 hover:bg-brand-green-800">
          Pay deposit to secure my date
        </a>
      )}
      {payPath && <p className="mt-3 text-xs font-medium text-slate-700">Free changes and cancellations up to 48 hours before your clean.</p>}
      <a href="tel:03330000000" className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl border-2 border-brand-green-200 px-5 py-3 font-semibold text-brand-green-800 hover:bg-brand-green-50">
        <Phone className="h-4 w-4" /> Questions? Call 0333 000 0000
      </a>
    </div>
  );
}

export default function ConfirmationPage() {
  return (
    <div className="bg-gradient-to-br from-brand-green-50 via-white to-brand-sky-50 px-4 py-20">
      <Suspense fallback={null}>
        <ConfirmationContent />
      </Suspense>
    </div>
  );
}
