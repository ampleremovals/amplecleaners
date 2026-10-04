"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

const GRADIENTS = [
  "from-brand-green-500 to-brand-green-400",
  "from-brand-sky-500 to-brand-sky-300",
  "from-brand-violet-500 to-brand-violet-300",
];

export function ServiceCard({
  icon: Icon, title, description, href, index = 0,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
  index?: number;
}) {
  const gradient = GRADIENTS[index % GRADIENTS.length];
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link
        href={href}
        className="group glass relative flex h-full flex-col overflow-hidden rounded-3xl p-6 shadow-[0_8px_30px_-12px_rgba(15,23,42,0.12)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_20px_40px_-15px_rgba(22,163,74,0.35)]"
      >
        <div className={`absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br ${gradient} opacity-20 blur-2xl transition-opacity group-hover:opacity-40`} />
        <span className={`relative mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} text-white shadow-lg`}>
          <Icon className="h-6 w-6" />
        </span>
        <h3 className="font-display text-lg font-bold text-slate-900">{title}</h3>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">{description}</p>
        <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-brand-green-700">
          Get a quote
          <span className="transition-transform group-hover:translate-x-1">→</span>
        </span>
      </Link>
    </motion.div>
  );
}
