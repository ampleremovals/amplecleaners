"use client";

import { motion } from "framer-motion";
import {
  Sparkles, Home, Building2, HardHat, Repeat, ShieldCheck, Clock, Star,
  CheckCircle2, ArrowRight, Timer, BadgeCheck, CalendarCheck, Wallet,
} from "lucide-react";
import { ServiceCard } from "@/components/shared/ServiceCard";
import { GradientMesh } from "@/components/shared/GradientMesh";
import { SERVICE_LABELS } from "@/types";
import { REGULAR_CLEANING_HOURLY_RATE, REGULAR_CLEANING_MIN_HOURS, regularCleaningPrice } from "@/lib/pricing";

const gbp = (n: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(n);

const SERVICES = [
  { key: "regular_cleaning", icon: Repeat, description: "Weekly, fortnightly or monthly — the same trusted cleaner every visit." },
  { key: "deep_cleaning", icon: Sparkles, description: "A thorough top-to-bottom clean, every room, every surface." },
  { key: "end_of_tenancy", icon: Home, description: "Get your full deposit back — checklist matched to agency standards." },
  { key: "office_cleaning", icon: Building2, description: "Flexible out-of-hours cleaning for offices and commercial space." },
  { key: "after_builders", icon: HardHat, description: "Dust, debris and mess cleared after renovation or building work." },
] as const;

const TRUST_PILLS = [
  { icon: ShieldCheck, label: "DBS-checked cleaners" },
  { icon: BadgeCheck, label: "Fixed price, no surprises" },
  { icon: Wallet, label: "Pay later, not upfront" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0 },
};

export default function HomePage() {
  return (
    <div className="overflow-x-clip">
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="mesh-bg relative px-4 pb-24 pt-16 sm:pb-32 sm:pt-20">
        <GradientMesh variant="hero" />
        <div className="container relative">
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.12 } } }}
            className="mx-auto max-w-3xl text-center"
          >
            <motion.span
              variants={fadeUp}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="glass-strong mb-6 inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-brand-green-800"
            >
              <ShieldCheck className="h-3.5 w-3.5" /> Vetted, DBS-checked cleaners
            </motion.span>

            <motion.h1
              variants={fadeUp}
              transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
              className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-slate-900 sm:text-6xl"
            >
              A spotless home,
              <br />
              <span className="text-gradient-brand">booked in minutes</span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              transition={{ duration: 0.6, delay: 0.05 }}
              className="mx-auto mt-6 max-w-xl text-lg text-slate-600"
            >
              Fixed price, no hidden fees. Regular cleaning from just{" "}
              <strong className="text-brand-green-700">£{REGULAR_CLEANING_HOURLY_RATE}/hour</strong> — pay a small
              deposit to secure your slot, the rest isn&apos;t due until the job&apos;s done.
            </motion.p>

            <motion.div
              variants={fadeUp}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="mt-10 flex flex-wrap items-center justify-center gap-4"
            >
              <a
                href="/booking/regular_cleaning"
                className="group flex items-center gap-2 rounded-2xl bg-gradient-to-r from-brand-green-600 via-brand-green-500 to-brand-green-600 px-7 py-4 font-display text-base font-bold text-white shadow-xl shadow-brand-green-400/40 transition-transform hover:scale-[1.04] active:scale-[0.98]"
              >
                Book your clean now
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </a>
              <a
                href="tel:03330000000"
                className="glass-strong rounded-2xl px-7 py-4 font-display text-base font-bold text-slate-800 transition-transform hover:scale-[1.03]"
              >
                Call 0333 000 0000
              </a>
            </motion.div>

            <motion.div
              variants={fadeUp}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="mx-auto mt-14 flex max-w-2xl flex-wrap items-center justify-center gap-3"
            >
              {TRUST_PILLS.map((pill, i) => (
                <span
                  key={pill.label}
                  className="animate-bob glass flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-slate-700"
                  style={{ animationDelay: `${i * 0.4}s` }}
                >
                  <pill.icon className="h-4 w-4 text-brand-green-600" />
                  {pill.label}
                </span>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── Services ─────────────────────────────────────────────────── */}
      <section id="services" className="relative px-4 py-20 sm:py-28">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mx-auto max-w-xl text-center"
          >
            <span className="text-sm font-bold uppercase tracking-widest text-brand-sky-600">What we clean</span>
            <h2 className="mt-2 font-display text-3xl font-extrabold text-slate-900 sm:text-4xl">
              Five services, <span className="text-gradient-brand">one fixed price</span>
            </h2>
          </motion.div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((s, i) => (
              <ServiceCard
                key={s.key}
                icon={s.icon}
                title={SERVICE_LABELS[s.key]}
                description={s.description}
                href={`/booking/${s.key}`}
                index={i}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────────────── */}
      <section id="pricing" className="relative px-4 py-20 sm:py-28">
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <GradientMesh />
        </div>
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mx-auto max-w-xl text-center"
          >
            <span className="text-sm font-bold uppercase tracking-widest text-brand-violet-600">Simple pricing</span>
            <h2 className="mt-2 font-display text-3xl font-extrabold text-slate-900 sm:text-4xl">
              Regular Cleaning, <span className="text-gradient-brand">priced by the hour</span>
            </h2>
            <p className="mt-3 text-slate-600">No quotes, no guesswork — just an honest hourly rate.</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="glass-strong relative mx-auto mt-12 max-w-2xl overflow-hidden rounded-[2rem] p-8 shadow-[0_30px_60px_-20px_rgba(22,163,74,0.35)] sm:p-10"
          >
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-brand-green-400/30 blur-3xl" />
            <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-brand-violet-400/25 blur-3xl" />

            <div className="relative flex flex-col items-center text-center">
              <span className="flex items-center gap-2 rounded-full bg-brand-green-600/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-brand-green-800">
                <Timer className="h-3.5 w-3.5" /> {REGULAR_CLEANING_MIN_HOURS} hour minimum booking
              </span>
              <div className="mt-6 flex items-end gap-2">
                <span className="font-display text-6xl font-extrabold tabular-nums text-brand-green-700 sm:text-7xl">
                  £{REGULAR_CLEANING_HOURLY_RATE}
                </span>
                <span className="mb-2 font-display text-xl font-bold text-slate-500">/ hour</span>
              </div>
              <p className="mt-2 text-slate-500">Every visit — no deep-clean upcharge, no travel fee, no VAT surprises.</p>

              <div className="mt-8 grid w-full gap-3 sm:grid-cols-3">
                {[3, 4, 5].map((h) => (
                  <div key={h} className="glass rounded-2xl p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{h} hours</p>
                    <p className="mt-1 font-display text-2xl font-extrabold text-slate-900">{gbp(regularCleaningPrice(h))}</p>
                  </div>
                ))}
              </div>

              <a
                href="/booking/regular_cleaning"
                className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-green-600 to-brand-green-500 px-6 py-4 font-display text-base font-bold text-white shadow-lg shadow-brand-green-400/40 transition-transform hover:scale-[1.02] sm:w-auto sm:px-10"
              >
                Book Regular Cleaning <ArrowRight className="h-4 w-4" />
              </a>
              <p className="mt-4 text-xs text-slate-400">
                Deep cleaning, end of tenancy, office &amp; after-builders are quoted individually — every property&apos;s different.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────── */}
      <section id="how-it-works" className="relative px-4 py-20 sm:py-28">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mx-auto max-w-xl text-center"
          >
            <span className="text-sm font-bold uppercase tracking-widest text-brand-green-600">How it works</span>
            <h2 className="mt-2 font-display text-3xl font-extrabold text-slate-900 sm:text-4xl">
              Three steps to spotless
            </h2>
          </motion.div>

          <div className="relative mt-14 grid gap-8 sm:grid-cols-3">
            <div className="absolute left-0 right-0 top-8 hidden h-px bg-gradient-to-r from-brand-green-300 via-brand-sky-300 to-brand-violet-300 sm:block" />
            {[
              { icon: Clock, title: "Get your price", body: "Tell us about your property — see your fixed price instantly.", grad: "from-brand-green-500 to-brand-green-400" },
              { icon: CalendarCheck, title: "Secure your date", body: "A small deposit locks in your cleaner and time slot.", grad: "from-brand-sky-500 to-brand-sky-300" },
              { icon: Star, title: "Enjoy the result", body: "Your vetted cleaner arrives, does the job, you rate the result.", grad: "from-brand-violet-500 to-brand-violet-300" },
            ].map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.12 }}
                className="glass relative z-10 flex flex-col items-center rounded-3xl p-7 text-center"
              >
                <span className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${step.grad} text-white shadow-lg`}>
                  <step.icon className="h-7 w-7" />
                </span>
                <h3 className="mt-5 font-display text-lg font-bold text-slate-900">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────── */}
      <section className="px-4 py-20 sm:py-28">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-brand-green-600 via-brand-green-500 to-brand-sky-500 px-8 py-16 text-center sm:px-16"
          >
            <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-white/15 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -right-10 h-64 w-64 rounded-full bg-brand-violet-400/30 blur-3xl" />
            <CheckCircle2 className="relative mx-auto h-12 w-12 text-white/90" />
            <h2 className="relative mt-5 font-display text-3xl font-extrabold text-white sm:text-4xl">
              Ready for a spotless space?
            </h2>
            <p className="relative mx-auto mt-3 max-w-md text-green-50">
              Get your fixed price in under a minute — no card needed until you&apos;re ready to book.
            </p>
            <a
              href="/booking/regular_cleaning"
              className="relative mt-8 inline-flex items-center gap-2 rounded-2xl bg-white px-8 py-4 font-display text-base font-bold text-brand-green-700 shadow-xl transition-transform hover:scale-[1.04]"
            >
              Get my free quote <ArrowRight className="h-4 w-4" />
            </a>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
