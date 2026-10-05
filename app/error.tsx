"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

/** Catches unexpected rendering errors anywhere below the root layout: a calm message and a retry, never a blank page. */
export default function GlobalRouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-brand-green-50 via-white to-brand-sky-50 px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100"><AlertTriangle className="h-8 w-8 text-red-600" /></div>
      <h1 className="mt-6 font-display text-2xl font-extrabold text-brand-green-950">Something went wrong</h1>
      <p className="mt-2 max-w-md text-slate-500">Sorry about that — it&apos;s on our side. Please try again, and if it keeps happening give us a call on 0333 000 0000.</p>
      {error.digest && <p className="mt-3 text-xs text-slate-300">Reference: {error.digest}</p>}
      <button onClick={reset} className="mt-8 rounded-xl bg-brand-green-700 px-6 py-3 font-bold text-white shadow-lg shadow-brand-green-200 hover:bg-brand-green-800">Try again</button>
    </main>
  );
}
