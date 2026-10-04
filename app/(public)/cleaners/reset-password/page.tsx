"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Sparkles, MailCheck, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function CleanerResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) { toast.error("Please enter your email"); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/cleaners/reset-password/request", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }),
      });
      if (!res.ok) { toast.error("Could not send reset email. Please try again."); setLoading(false); return; }
      setSent(true);
    } catch {
      toast.error("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
        <div className="w-full max-w-md rounded-2xl bg-slate-900 p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-600/20">
            <MailCheck className="h-8 w-8 text-green-400" />
          </div>
          <h1 className="mb-2 text-2xl font-bold text-white">Check your email</h1>
          <p className="mb-6 text-slate-400">
            If an account exists for <span className="font-medium text-slate-200">{email}</span>, we&apos;ve sent a link to set your password. It expires in 1 hour.
          </p>
          <Link href="/admin/login" className="inline-flex items-center gap-2 text-sm font-medium text-brand-green-400 hover:text-brand-green-300">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-green-600">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="mt-4 text-3xl font-bold text-white">Reset your password</h1>
          <p className="mt-2 text-slate-400">We&apos;ll email you a link to set a new one.</p>
        </div>
        <form onSubmit={handleSubmit} className="rounded-2xl bg-slate-900 p-6">
          <label className="mb-2 block text-sm font-medium text-slate-300">Email</label>
          <input
            type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
            className="mb-4 w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-white placeholder-slate-500 focus:border-brand-green-500 focus:outline-none focus:ring-2 focus:ring-brand-green-500/20"
          />
          <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-green-600 px-6 py-3 font-semibold text-white hover:bg-brand-green-700 disabled:opacity-50">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Send reset link"}
          </button>
        </form>
      </div>
    </div>
  );
}
