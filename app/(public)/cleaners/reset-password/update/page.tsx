"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Sparkles, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export default function CleanerUpdatePasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Supabase establishes a temporary recovery session from the email link's
    // ?code= (PKCE) or #access_token (implicit), exchanged asynchronously on
    // load — wait for the auth event rather than reading the session once.
    const supabase = createClient();
    let resolved = false;
    const finish = (ok: boolean) => {
      if (resolved) return;
      resolved = true;
      setHasSession(ok);
      setCheckingSession(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN" || session) finish(true);
    });

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) return finish(true);

      const url = new URL(window.location.href);
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const hasRecoveryParams = url.searchParams.has("code") || hash.has("access_token") || hash.get("type") === "recovery" || url.searchParams.get("type") === "recovery";
      if (!hasRecoveryParams) return finish(false);
      window.setTimeout(() => finish(false), 8000);
    })();

    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    if (password !== confirmPassword) { toast.error("Passwords do not match"); return; }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) { toast.error(error.message || "Could not update password"); setLoading(false); return; }
      await supabase.auth.signOut();
      setDone(true);
    } catch {
      toast.error("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  if (checkingSession) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-950"><Loader2 className="h-8 w-8 animate-spin text-brand-green-500" /></div>;
  }

  if (!hasSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
        <div className="w-full max-w-md rounded-2xl bg-slate-900 p-8 text-center">
          <h1 className="mb-2 text-2xl font-bold text-white">Link expired</h1>
          <p className="mb-6 text-slate-500">This password link is invalid or has expired. Please request a new one.</p>
          <Link href="/cleaners/reset-password" className="inline-block rounded-xl bg-brand-green-600 px-6 py-3 font-semibold text-white hover:bg-brand-green-700">
            Request new link
          </Link>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
        <div className="w-full max-w-md rounded-2xl bg-slate-900 p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-600/20">
            <ShieldCheck className="h-8 w-8 text-green-400" />
          </div>
          <h1 className="mb-2 text-2xl font-bold text-white">Password set!</h1>
          <p className="text-slate-500">You can now sign in from the Ample Cleaner app.</p>
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
          <h1 className="mt-4 text-3xl font-bold text-white">Set your password</h1>
          <p className="mt-2 text-slate-500">Choose a strong password for your account</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl bg-slate-900 p-6">
          <label className="mb-2 block text-sm font-medium text-slate-300">New password</label>
          <input
            type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min. 8 characters"
            className="mb-4 w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-white placeholder-slate-500 focus:border-brand-green-500 focus:outline-none focus:ring-2 focus:ring-brand-green-500/20"
          />
          <label className="mb-2 block text-sm font-medium text-slate-300">Confirm password</label>
          <input
            type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-type password"
            className="mb-4 w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-white placeholder-slate-500 focus:border-brand-green-500 focus:outline-none focus:ring-2 focus:ring-brand-green-500/20"
          />
          <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-green-600 px-6 py-3 font-semibold text-white hover:bg-brand-green-700 disabled:opacity-50">
            {loading ? <><Loader2 className="h-5 w-5 animate-spin" /> Updating…</> : <><ShieldCheck className="h-5 w-5" /> Set password</>}
          </button>
        </form>
      </div>
    </div>
  );
}
