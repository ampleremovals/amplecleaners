"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, BadgeCheck, CalendarClock, ShieldCheck, Wallet } from "lucide-react";
import { usePricing } from "@/components/shared/PricingProvider";

const money = (n: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: Number.isInteger(n) ? 0 : 2 }).format(n);

/** What the booking button promises: a live "from" price for the hourly service, a fixed quote for the rest. */
function useOffer(serviceType: string) {
  const { hourlyRate, minHours, depositPercentage, price } = usePricing();
  const hourly = serviceType === "regular_cleaning";
  return { hourly, depositPercentage, headline: hourly ? `From ${money(price(minHours))}` : "Fixed price quote", sub: hourly ? `${money(hourlyRate)} an hour, ${minHours} hour minimum` : "Quoted for your property, then fixed" };
}

/** Desktop: a sticky price card beside the page content. */
export function BookCard({ href, serviceType, place, label }: { href: string; serviceType: string; place: string; label: string }) {
  const o = useOffer(serviceType);
  return (
    <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_20px_50px_-25px_rgba(15,23,42,0.35)] print:hidden" aria-label="Book">
      <p className="text-xs font-bold text-slate-500">Cleaning in {place}</p>
      <p className="mt-2 font-display text-3xl font-bold leading-none tracking-tight text-slate-900">{o.headline}</p>
      <p className="mt-2 text-sm text-slate-600">{o.sub}</p>
      <Link href={href} className="group mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-green-700 px-6 py-4 font-display text-[0.95rem] font-bold text-white shadow-lg shadow-brand-green-700/25 transition hover:bg-brand-green-800">
        {label} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </Link>
      <p className="mt-2.5 text-center text-xs text-slate-500">Takes about 2 minutes. No card needed to see your price.</p>
      <ul className="mt-5 space-y-3 border-t border-slate-100 pt-5 text-sm text-slate-700">
        <li className="flex items-center gap-2.5"><ShieldCheck className="h-4 w-4 shrink-0 text-brand-green-700" /> DBS-checked and fully insured</li>
        <li className="flex items-center gap-2.5"><BadgeCheck className="h-4 w-4 shrink-0 text-brand-green-700" /> The price you see is the price you pay</li>
        <li className="flex items-center gap-2.5"><Wallet className="h-4 w-4 shrink-0 text-brand-green-700" /> Only {o.depositPercentage}% to book</li>
        <li className="flex items-center gap-2.5"><CalendarClock className="h-4 w-4 shrink-0 text-brand-green-700" /> Free changes up to 48h before</li>
      </ul>
    </aside>
  );
}

/** Phones: a bar that appears after the first screen and steps aside near the page end. */
export function StickyBookBar({ href, serviceType, label }: { href: string; serviceType: string; label: string }) {
  const o = useOffer(serviceType);
  const [show, setShow] = useState(false);
  useEffect(() => {
    const update = () => {
      const y = window.scrollY;
      const nearEnd = y + window.innerHeight > document.documentElement.scrollHeight - 650;
      setShow(y > 420 && !nearEnd);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => { window.removeEventListener("scroll", update); window.removeEventListener("resize", update); };
  }, []);
  return (
    <div
      aria-hidden={!show}
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 pt-3 shadow-[0_-10px_30px_-12px_rgba(15,23,42,0.25)] backdrop-blur transition-transform duration-300 lg:hidden print:hidden pb-[max(0.75rem,env(safe-area-inset-bottom))] ${show ? "translate-y-0" : "pointer-events-none translate-y-full"}`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm leading-tight text-slate-600">
          <span className="block font-display text-base font-bold text-slate-900">{o.headline}</span>
          {o.depositPercentage}% to book
        </p>
        <Link href={href} tabIndex={show ? 0 : -1} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-brand-green-700 px-5 py-3 font-display text-sm font-bold text-white shadow-md active:scale-95">
          {label} <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
