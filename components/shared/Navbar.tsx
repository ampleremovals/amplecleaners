import Link from "next/link";
import { Sparkles } from "lucide-react";

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-display text-lg font-extrabold text-brand-teal-800">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-teal-700 text-white">
            <Sparkles className="h-5 w-5" />
          </span>
          Ample Cleaners
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 sm:flex">
          <Link href="/#services" className="hover:text-brand-teal-700">Services</Link>
          <Link href="/#how-it-works" className="hover:text-brand-teal-700">How it works</Link>
          <a href="tel:03330000000" className="hover:text-brand-teal-700">0333 000 0000</a>
        </nav>
        <Link
          href="/booking/regular_cleaning"
          className="rounded-xl bg-brand-teal-700 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-brand-teal-800"
        >
          Get a quote
        </Link>
      </div>
    </header>
  );
}
