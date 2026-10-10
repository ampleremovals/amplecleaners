"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, Loader2, MailX } from "lucide-react";
import { Button } from "@/components/ui/button";

type Stage = "loading" | "ready" | "working" | "done" | "undone" | "error";

export default function UnsubscribePage() {
  const token = useParams().token as string;
  const [stage, setStage] = useState<Stage>("loading");
  const [email, setEmail] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/unsubscribe/${token}`)
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (!j.success) return setStage("error");
        setEmail(j.email);
        setStage(j.unsubscribed ? "done" : "ready");
      })
      .catch(() => !cancelled && setStage("error"));
    return () => { cancelled = true; };
  }, [token]);

  async function post(undo: boolean) {
    setStage("working");
    try {
      const r = await fetch(`/api/unsubscribe/${token}${undo ? "?undo=1" : ""}`, { method: "POST" });
      const j = await r.json();
      setStage(j.success ? (undo ? "undone" : "done") : "error");
    } catch {
      setStage("error");
    }
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-slate-50 px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        {stage === "loading" && <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-400" aria-label="Loading" />}
        {stage === "error" && (
          <>
            <MailX className="mx-auto h-10 w-10 text-slate-400" aria-hidden />
            <h1 className="mt-4 font-display text-xl font-bold text-slate-900">This link isn&apos;t valid</h1>
            <p className="mt-2 text-sm text-slate-600">Please reply to any of our emails and we&apos;ll remove you by hand.</p>
          </>
        )}
        {(stage === "ready" || stage === "working") && (
          <>
            <MailX className="mx-auto h-10 w-10 text-brand-green-700" aria-hidden />
            <h1 className="mt-4 font-display text-xl font-bold text-slate-900">Unsubscribe from our emails?</h1>
            <p className="mt-2 text-sm text-slate-600">We&apos;ll stop sending tips and offers to <strong>{email}</strong>. Emails about a booking you make with us will still reach you.</p>
            <Button className="mt-6 w-full" disabled={stage === "working"} onClick={() => post(false)}>
              {stage === "working" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Yes, unsubscribe me"}
            </Button>
          </>
        )}
        {stage === "done" && (
          <>
            <CheckCircle2 className="mx-auto h-10 w-10 text-brand-green-700" aria-hidden />
            <h1 className="mt-4 font-display text-xl font-bold text-slate-900">You&apos;re unsubscribed</h1>
            <p className="mt-2 text-sm text-slate-600"><strong>{email}</strong> won&apos;t get marketing emails from us any more. Emails about a booking will still reach you.</p>
            <button type="button" onClick={() => post(true)} className="mt-6 text-sm font-medium text-brand-green-800 underline underline-offset-2">I changed my mind. Subscribe me again</button>
          </>
        )}
        {stage === "undone" && (
          <>
            <CheckCircle2 className="mx-auto h-10 w-10 text-brand-green-700" aria-hidden />
            <h1 className="mt-4 font-display text-xl font-bold text-slate-900">Welcome back</h1>
            <p className="mt-2 text-sm text-slate-600">You&apos;re subscribed again.</p>
          </>
        )}
      </div>
    </div>
  );
}
