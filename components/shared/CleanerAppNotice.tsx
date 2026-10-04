import Link from "next/link";
import Image from "next/image";
import { Smartphone } from "lucide-react";

/** Cleaners work in the mobile app; the web `/cleaners/*` routes only point them there. */
export function CleanerAppNotice({ title }: { title: string }) {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-6 py-16">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-200/60">
        <Image src="/logo-icon.png" alt="Ample Cleaners" width={512} height={512} priority className="mx-auto mb-4 h-16 w-16 rounded-2xl" />
        <h1 className="font-display text-2xl font-extrabold text-brand-green-950">{title}</h1>
        <p className="mt-3 text-slate-500">
          Cleaners sign in, see their jobs and clock in and out in the <strong>Ample Cleaner</strong> mobile app.
        </p>
        <div className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-brand-green-50 px-4 py-3 text-sm font-semibold text-brand-green-800">
          <Smartphone className="h-4 w-4" /> Open the app on your phone to sign in
        </div>
        <p className="mt-5 text-sm text-slate-400">
          Forgot your password? <Link href="/cleaners/reset-password" className="font-semibold text-brand-green-700 hover:underline">Reset it here</Link>
        </p>
      </div>
    </div>
  );
}
