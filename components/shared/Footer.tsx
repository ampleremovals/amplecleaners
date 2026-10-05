import Link from "next/link";
import Image from "next/image";
import { SEO_SERVICES } from "@/lib/seo/services";

/** A handful of the biggest areas, linked site-wide; every area is reachable from the service hub pages. */
const FEATURED = ["barking", "dagenham", "romford", "hornchurch", "ilford", "upminster", "stratford", "chadwell-heath"];

export function Footer() {
  return (
    <footer className="print:hidden relative mt-20 overflow-hidden bg-brand-green-950 py-14 text-slate-300">
      <div className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-brand-sky-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-brand-violet-500/20 blur-3xl" />
      <div className="container relative flex flex-col items-center gap-6 text-center sm:flex-row sm:justify-between sm:text-left">
        <div className="flex items-center gap-2.5 font-display text-lg font-extrabold text-white">
          <Image src="/logo-icon.png" alt="" width={72} height={72} className="h-9 w-9 rounded-xl" />
          Ample Cleaners
        </div>
        <nav className="flex flex-wrap items-center justify-center gap-5 text-sm font-medium">
          <Link href="/#services" className="hover:text-white">Services</Link>
          <Link href="/#pricing" className="hover:text-white">Pricing</Link>
          <Link href="/#how-it-works" className="hover:text-white">How it works</Link>
          <Link href="/areas" className="hover:text-white">Areas we cover</Link>
          <Link href="/guides" className="hover:text-white">Cleaning guides</Link>
          <Link href="/blog" className="hover:text-white">News &amp; tips</Link>
          <Link href="/cleaners/register" className="hover:text-white">Become a cleaner</Link>
          <a href="tel:03330000000" className="hover:text-white">0333 000 0000</a>
        </nav>
      </div>
      <div className="container relative mt-8 grid gap-6 border-t border-white/10 pt-6 text-center text-sm sm:grid-cols-2 sm:text-left">
        <nav aria-label="Cleaning services">
          <p className="font-bold text-white">Our cleaning services</p>
          <ul className="mt-2 space-y-1">
            {SEO_SERVICES.map((s) => <li key={s.slug}><Link href={`/${s.slug}`} className="hover:text-white">{s.name}</Link></li>)}
          </ul>
        </nav>
        <nav aria-label="Areas we cover">
          <p className="font-bold text-white">Areas we cover</p>
          <ul className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 sm:justify-start">
            {FEATURED.map((a) => <li key={a}><Link href={`/cleaning-services/${a}`} className="capitalize hover:text-white">{a.replace("-", " ")}</Link></li>)}
          </ul>
        </nav>
      </div>
      <div className="container relative mt-8 flex flex-col items-center gap-2 border-t border-white/10 pt-6 text-center text-xs text-slate-400 sm:flex-row sm:justify-between">
        <p>&copy; {new Date().getFullYear()} Ample Cleaners. All rights reserved.</p>
        <nav className="flex items-center gap-4" aria-label="Legal">
          <Link href="/privacy" className="hover:text-white">Privacy</Link>
          <Link href="/terms" className="hover:text-white">Terms</Link>
          <span>hello@amplecleaners.com</span>
        </nav>
      </div>
    </footer>
  );
}
