import Link from "next/link";
import Image from "next/image";

export function Footer() {
  return (
    <footer className="relative mt-20 overflow-hidden bg-brand-green-950 py-14 text-slate-300">
      <div className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-brand-sky-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-brand-violet-500/20 blur-3xl" />
      <div className="container relative flex flex-col items-center gap-6 text-center sm:flex-row sm:justify-between sm:text-left">
        <div className="flex items-center gap-2.5 font-display text-lg font-extrabold text-white">
          <Image src="/logo-icon.png" alt="" width={512} height={512} className="h-9 w-9 rounded-xl" />
          Ample Cleaners
        </div>
        <nav className="flex flex-wrap items-center justify-center gap-5 text-sm font-medium">
          <Link href="/#services" className="hover:text-white">Services</Link>
          <Link href="/#pricing" className="hover:text-white">Pricing</Link>
          <Link href="/#how-it-works" className="hover:text-white">How it works</Link>
          <a href="tel:03330000000" className="hover:text-white">0333 000 0000</a>
        </nav>
      </div>
      <div className="container relative mt-8 flex flex-col items-center gap-2 border-t border-white/10 pt-6 text-center text-xs text-slate-400 sm:flex-row sm:justify-between">
        <p>&copy; {new Date().getFullYear()} Ample Cleaners. All rights reserved.</p>
        <p>hello@amplecleaners.com</p>
      </div>
    </footer>
  );
}
