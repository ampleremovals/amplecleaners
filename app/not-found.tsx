import Link from "next/link";
import Image from "next/image";

export const metadata = { title: "Page not found", robots: { index: false } };

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-brand-green-50 via-white to-brand-sky-50 px-6 text-center">
      <Image src="/logo-full.png" alt="Ample Cleaners" width={400} height={160} priority className="h-16 w-auto" />
      <p className="mt-10 font-display text-6xl font-extrabold text-brand-green-700">404</p>
      <h1 className="mt-3 font-display text-2xl font-extrabold text-brand-green-950">We couldn&apos;t find that page</h1>
      <p className="mt-2 max-w-md text-slate-500">The link may be old or mistyped. Let&apos;s get you back to somewhere useful.</p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link href="/" className="rounded-xl bg-brand-green-700 px-6 py-3 font-bold text-white shadow-lg shadow-brand-green-200 hover:bg-brand-green-800">Back to home</Link>
        <Link href="/booking/regular_cleaning" className="rounded-xl border-2 border-brand-green-200 px-6 py-3 font-semibold text-brand-green-800 hover:bg-brand-green-50">Book a clean</Link>
      </div>
    </main>
  );
}
