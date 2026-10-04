"use client";

import Link from "next/link";
import Image from "next/image";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 px-3 pt-3 sm:px-5">
      <div className="glass-nav container flex h-16 items-center justify-between rounded-2xl border border-white/50 shadow-[0_8px_30px_-10px_rgba(22,163,74,0.25)]">
        <Link href="/" className="flex items-center">
          <Image src="/logo-full.png" alt="Ample Cleaners" width={790} height={316} priority className="h-11 w-auto" />
        </Link>
        <nav className="hidden items-center gap-1 text-sm font-semibold text-slate-700 sm:flex">
          <Link href="/#services" className="rounded-full px-3.5 py-2 transition-colors hover:bg-brand-green-600/10 hover:text-brand-green-800">Services</Link>
          <Link href="/#pricing" className="rounded-full px-3.5 py-2 transition-colors hover:bg-brand-green-600/10 hover:text-brand-green-800">Pricing</Link>
          <Link href="/#how-it-works" className="rounded-full px-3.5 py-2 transition-colors hover:bg-brand-green-600/10 hover:text-brand-green-800">How it works</Link>
          <a href="tel:03330000000" className="rounded-full px-3.5 py-2 transition-colors hover:bg-brand-green-600/10 hover:text-brand-green-800">0333 000 0000</a>
        </nav>
        <Link
          href="/booking/regular_cleaning"
          className="rounded-xl bg-gradient-to-r from-brand-green-600 to-brand-green-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand-green-400/40 transition-transform hover:scale-[1.03] active:scale-[0.98]"
        >
          Book now
        </Link>
      </div>
    </header>
  );
}
