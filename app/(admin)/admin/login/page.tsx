"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectedFrom = searchParams.get("redirectedFrom") || "/admin";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError("Invalid email or password. Please try again.");
      setLoading(false);
      return;
    }

    router.replace(redirectedFrom);
    router.refresh();
  };

  return (
    <div className="admin-shell grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel — desktop only */}
      <aside className="relative hidden overflow-hidden bg-brand-green-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -left-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-brand-green-500/25 blur-[110px]" aria-hidden />
        <div className="pointer-events-none absolute -bottom-40 right-0 h-[26rem] w-[26rem] rounded-full bg-brand-sky-500/15 blur-[110px]" aria-hidden />
        <div className="relative flex items-center gap-3">
          <Image src="/logo-icon.png" alt="" width={64} height={64} priority className="h-10 w-10 rounded-xl" />
          <span className="text-lg font-semibold tracking-tight">Ample Cleaners</span>
        </div>
        <div className="relative max-w-md">
          <h2 className="text-balance text-3xl font-semibold leading-tight tracking-tight">Every booking, cleaner and payment in one place.</h2>
          <p className="mt-4 text-base text-brand-green-100">Staff access to the Ample Cleaners operations dashboard.</p>
        </div>
        <p className="relative flex items-center gap-2 text-sm text-brand-green-100"><ShieldCheck className="h-4 w-4" /> Authorised staff only. Access is logged.</p>
      </aside>

      {/* Form */}
      <main className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <Image src="/logo-icon.png" alt="" width={64} height={64} priority className="h-10 w-10 rounded-xl" />
            <span className="text-lg font-semibold tracking-tight text-slate-900">Ample Cleaners</span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">Sign in</h1>
          <p className="mt-1.5 text-sm text-slate-500">Use your staff account to continue.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[13px] font-medium text-slate-700">Email</Label>
              <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@amplecleaners.com" className="h-11 bg-white" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-[13px] font-medium text-slate-700">Password</Label>
              <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 bg-white" />
            </div>
            {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>}
            <Button type="submit" disabled={loading} className="h-11 w-full bg-brand-green-700 text-sm font-semibold hover:bg-brand-green-800">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
