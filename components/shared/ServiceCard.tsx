"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";

// Solid light tint + dark icon: always readable, and the three brand colours rotate across the grid.
const TINTS = [
  "bg-brand-green-100 text-brand-green-800",
  "bg-brand-sky-100 text-brand-sky-700",
  "bg-brand-violet-100 text-brand-violet-700",
];

export function ServiceCard({
  icon: Icon, title, description, href, cta = "Get a quote", index = 0, featured = false, badge,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
  /** Button label — benefit-led and specific beats a generic "Get a quote". */
  cta?: string;
  index?: number;
  /** The lead service: spans two columns on wide screens, on a deep-green panel. */
  featured?: boolean;
  /** Small label on the card, e.g. "From £45". */
  badge?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 1, y: 24 }}
      whileInView={{ y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      className={featured ? "sm:col-span-2" : undefined}
    >
      <Link
        href={href}
        className={
          featured
            ? "group relative flex h-full flex-col overflow-hidden rounded-3xl bg-brand-green-950 p-6 text-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl sm:p-8"
            : "group relative flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-brand-green-300 hover:shadow-xl"
        }
      >
        {featured && (
          <>
            <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-brand-green-500/30 blur-[70px]" aria-hidden />
            <div className="pointer-events-none absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-brand-sky-500/20 blur-[70px]" aria-hidden />
          </>
        )}
        <div className="relative flex items-start justify-between gap-3">
          <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${featured ? "bg-white/15 text-white" : TINTS[(index - 1 + TINTS.length) % TINTS.length]}`}>
            <Icon className="h-6 w-6" />
          </span>
          {badge && (
            <span className="rounded-full bg-white px-3 py-1.5 font-display text-xs font-bold text-brand-green-900">{badge}</span>
          )}
        </div>
        <h3 className={`relative mt-5 font-display text-lg font-bold ${featured ? "text-white sm:text-xl" : "text-slate-900"}`}>{title}</h3>
        <p className={`relative mt-2 flex-1 text-[15px] leading-relaxed ${featured ? "max-w-xl text-brand-green-50" : "text-slate-600"}`}>{description}</p>
        <span className={`relative mt-5 inline-flex items-center gap-1.5 text-sm font-bold ${featured ? "text-white" : "text-brand-green-700"}`}>
          {cta}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </span>
      </Link>
    </motion.div>
  );
}
