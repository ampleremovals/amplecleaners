"use client";

import Link from "next/link";
import Image from "next/image";
import { Phone } from "lucide-react";

const LINK = "rounded-full px-3.5 py-2 transition-colors hover:bg-brand-green-50 hover:text-brand-green-800";

export function Navbar() {
  return (
    <header className="print:hidden sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="container flex h-16 items-center justify-between gap-3 sm:h-[4.5rem]">
        <Link href="/" className="flex shrink-0 items-center" aria-label="Ample Cleaners home">
          {/* Shown ~110-130px wide: `sizes` makes the optimiser serve a small file instead of the 750px default (48KB -> ~12KB on the critical path). */}
          <Image src="/logo-full.png" alt="Ample Cleaners" width={330} height={132} sizes="132px" priority className="h-11 w-auto sm:h-[3.25rem]" />
        </Link>
        <nav className="hidden items-center gap-1 text-sm font-semibold text-slate-700 md:flex">
          <Link href="/#services" className={LINK}>Services</Link>
          <Link href="/#pricing" className={LINK}>Pricing</Link>
          <Link href="/#how-it-works" className={LINK}>How it works</Link>
          <Link href="/areas" className={LINK}>Areas</Link>
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <a
            href="tel:03330000000"
            aria-label="Call us on 0333 000 0000"
            className="hidden items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-brand-green-50 hover:text-brand-green-800 lg:inline-flex"
          >
            <Phone className="h-4 w-4" /> 0333 000 0000
          </a>
          <a
            href="tel:03330000000"
            aria-label="Call us"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 text-slate-800 transition-colors hover:bg-brand-green-50 lg:hidden"
          >
            <Phone className="h-[18px] w-[18px]" />
          </a>
          <Link
            href="/booking/regular_cleaning"
            className="rounded-full bg-brand-green-700 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-brand-green-800 active:scale-95"
          >
            Book now
          </Link>
        </div>
      </div>
    </header>
  );
}
