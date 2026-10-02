"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Phone } from "lucide-react";

function ConfirmationContent() {
  const params = useSearchParams();
  const ref = params.get("ref");
  return (
    <div className="mx-auto max-w-md text-center">
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-brand-teal-100">
        <CheckCircle2 className="h-12 w-12 text-brand-teal-700" />
      </div>
      <h1 className="font-display text-3xl font-extrabold text-slate-900">Thank you!</h1>
      <p className="mt-3 text-slate-500">
        We&apos;ve got your request — a member of the team will send your fixed-price quote shortly by email, SMS and WhatsApp.
      </p>
      {ref && (
        <div className="mx-auto mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
          <p className="text-sm text-slate-500">Your booking reference</p>
          <p className="mt-1 font-display text-2xl font-extrabold text-brand-teal-800">{ref}</p>
        </div>
      )}
      <a href="tel:03330000000" className="mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-brand-teal-700 px-5 py-3 font-semibold text-white hover:bg-brand-teal-800">
        <Phone className="h-4 w-4" /> Need us sooner? Call 0333 000 0000
      </a>
    </div>
  );
}

export default function ConfirmationPage() {
  return (
    <div className="bg-gradient-to-br from-brand-teal-50 via-white to-brand-sky-50 px-4 py-20">
      <Suspense fallback={null}>
        <ConfirmationContent />
      </Suspense>
    </div>
  );
}
