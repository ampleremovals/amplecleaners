"use client";

import { motion } from "framer-motion";
import {
  Sparkles, Home, Building2, HardHat, Repeat, ShieldCheck, Clock, Star, ChevronDown,
  CheckCircle2, ArrowRight, Timer, BadgeCheck, CalendarCheck, Wallet, CalendarClock, Tag,
} from "lucide-react";
import { ServiceCard } from "@/components/shared/ServiceCard";
import { GradientMesh } from "@/components/shared/GradientMesh";
import { SERVICE_LABELS } from "@/types";
import { usePricing } from "@/components/shared/PricingProvider";

const money = (n: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 }).format(n);

const SERVICES = [
  { key: "regular_cleaning", icon: Repeat, cta: "See my price", description: "Weekly, fortnightly or monthly — the same cleaner wherever possible, billed after every visit. No contract, stop any time." },
  { key: "deep_cleaning", icon: Sparkles, cta: "Get my fixed price", description: "Every room, every surface, top to bottom — inside the oven and fridge, and the grime you've stopped noticing." },
  { key: "end_of_tenancy", icon: Home, cta: "Get my fixed price", description: "A clean built around your check-out list, so you hand the keys back with confidence." },
  { key: "office_cleaning", icon: Building2, cta: "Get my fixed price", description: "Out-of-hours cleaning, so your team walks into a fresh, professional space every morning." },
  { key: "after_builders", icon: HardHat, cta: "Get my fixed price", description: "Dust, residue and plaster-dust cleared — so your finished space is actually ready to enjoy." },
] as const;

// No opacity dip — text/buttons never fully disappear, even for a slow
// hydration, just slides up gently into place.
const fadeUp = {
  hidden: { opacity: 1, y: 22 },
  show: { opacity: 1, y: 0 },
};

export default function HomePage() {
  const { hourlyRate, minHours, depositPercentage, price, rating } = usePricing();
  const startPrice = price(minHours);

  const trustPills = [
    { icon: ShieldCheck, label: "DBS-checked cleaners" },
    { icon: BadgeCheck, label: "Fixed price — zero surprises" },
    { icon: Wallet, label: `Only ${depositPercentage}% to book` },
    { icon: CalendarClock, label: "Free changes up to 48h before" },
  ];

  const faqs = [
    { q: "How is my price worked out?", a: `Regular Cleaning is £${hourlyRate} per hour with a ${minHours}-hour minimum. You choose your hours and see the exact total before you commit — it doesn't change on the day. Deep, end of tenancy, office and after-builders cleans are quoted individually because every property is different, and the quote is fixed too.` },
    { q: "When do I pay?", a: `You pay just ${depositPercentage}% to lock in your date — and that comes off your total, it's not an extra. The rest is invoiced after the clean, once you can see the result. Pay by card or by bank transfer (no card fee).` },
    { q: "Are your cleaners vetted?", a: "Every cleaner is DBS-checked before they're ever matched to a job. You'll know who's coming — we tell you your cleaner's first name before the day." },
    { q: "What if I need to change or cancel?", a: "Move or cancel for free up to 48 hours before your clean, in a couple of taps, using the link in your booking messages. Regular cleans have no contract — stop whenever you like." },
    { q: "What if I'm not happy with the clean?", a: "Tell us within 24 hours and we'll put it right — that can include coming back to re-clean the area at no extra cost." },
    { q: "Do I need to be home? Do I need to buy products?", a: "You don't need to be in — just tell us how we'll get access when you book. We bring the equipment needed, and if you'd like us to use your own products, say so in your booking notes." },
  ];
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };

  return (
    <div className="page-wash overflow-x-clip">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      {/* One continuous colourful backdrop spanning hero → services → pricing,
          so there's never a plain-white gap between sections. */}
      <div className="relative">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <GradientMesh variant="hero" spread="tall" />
        </div>

        {/* ── Hero ───────────────────────────────────────────────────── */}
        <section className="relative px-4 pb-16 pt-14 sm:pb-20 sm:pt-20">
          <div className="container relative">
            <motion.div
              initial="hidden"
              animate="show"
              variants={{ show: { transition: { staggerChildren: 0.08 } } }}
              className="mx-auto max-w-3xl text-center"
            >
              <motion.span
                variants={fadeUp}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="glass-strong mb-6 inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-brand-green-800"
              >
                <ShieldCheck className="h-3.5 w-3.5" /> DBS-checked cleaners · fixed price
              </motion.span>

              <motion.h1
                variants={fadeUp}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-slate-900 sm:text-6xl"
              >
                Come home to a spotless house — from {money(startPrice)}
              </motion.h1>

              <motion.p
                variants={fadeUp}
                transition={{ duration: 0.45, delay: 0.04 }}
                className="mx-auto mt-6 max-w-xl text-lg text-slate-700"
              >
                Choose your hours, see your <strong>exact price instantly</strong>, and pay just {depositPercentage}% to lock in your date.
                A DBS-checked cleaner does the rest — and you only pay the balance once the job&apos;s done.
              </motion.p>

              <motion.div
                variants={fadeUp}
                transition={{ duration: 0.45, delay: 0.08 }}
                className="mt-10 flex flex-wrap items-center justify-center gap-4"
              >
                <a
                  href="/booking/regular_cleaning"
                  className="group flex items-center gap-2 rounded-2xl bg-gradient-to-r from-brand-green-600 via-brand-green-500 to-brand-green-600 px-7 py-4 font-display text-base font-bold text-white shadow-xl shadow-brand-green-500/50 transition-transform hover:scale-[1.04] active:scale-[0.98]"
                >
                  See my exact price
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </a>
                <a
                  href="tel:03330000000"
                  className="glass-strong rounded-2xl px-7 py-4 font-display text-base font-bold text-slate-800 transition-transform hover:scale-[1.03]"
                >
                  Call 0333 000 0000
                </a>
              </motion.div>
              <motion.p variants={fadeUp} transition={{ duration: 0.45, delay: 0.1 }} className="mt-4 text-sm font-medium text-slate-700">
                Takes about 2 minutes · No card needed to see your price
              </motion.p>

              <motion.div
                variants={fadeUp}
                transition={{ duration: 0.45, delay: 0.12 }}
                className="mx-auto mt-10 flex max-w-2xl flex-wrap items-center justify-center gap-3"
              >
                {trustPills.map((pill, i) => (
                  <span
                    key={pill.label}
                    className="animate-bob glass-strong flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-slate-800"
                    style={{ animationDelay: `${i * 0.4}s` }}
                  >
                    <pill.icon className="h-4 w-4 text-brand-green-600" />
                    {pill.label}
                  </span>
                ))}
                {rating && (
                  <span className="glass-strong flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-slate-800">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    {rating.average.toFixed(1)} from {rating.count} customer reviews
                  </span>
                )}
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* ── The problem we solve ───────────────────────────────────── */}
        <section className="relative px-4 py-10 sm:py-14">
          <div className="container">
            <motion.div
              initial={{ opacity: 1, y: 16 }}
              whileInView={{ y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="mx-auto max-w-2xl text-center"
            >
              <span className="text-sm font-bold uppercase tracking-widest text-brand-green-700">Sound familiar?</span>
              <h2 className="mt-2 font-display text-3xl font-extrabold text-slate-900 sm:text-4xl">
                Hiring a cleaner shouldn&apos;t feel like a gamble
              </h2>
              <p className="mt-4 text-lg text-slate-700">
                Vague quotes that grow on the day. Strangers you know nothing about. Paying everything upfront for a job you can&apos;t judge yet. We built Ample Cleaners to take every one of those worries away.
              </p>
            </motion.div>
            <div className="mx-auto mt-10 grid max-w-5xl gap-5 sm:grid-cols-3">
              {[
                { icon: Tag, title: "The price you see is the price you pay", body: "Pick your hours and your total appears instantly. No \"it depends\", no extras on the day, no travel fee." },
                { icon: ShieldCheck, title: "Cleaners you can trust in your home", body: "Every cleaner is DBS-checked before they're matched to you — and you'll know their first name before they arrive." },
                { icon: Wallet, title: "You pay the balance after the clean", body: `Just ${depositPercentage}% secures your date (and comes off your total). The rest is due once the job's done and you've seen the result.` },
              ].map((c, i) => (
                <motion.div
                  key={c.title}
                  initial={{ opacity: 1, y: 20 }}
                  whileInView={{ y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                  className="glass-strong rounded-3xl p-6 text-left"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-green-100 text-brand-green-800"><c.icon className="h-6 w-6" /></span>
                  <h3 className="mt-4 font-display text-lg font-bold text-slate-900">{c.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-700">{c.body}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Services ───────────────────────────────────────────────── */}
        <section id="services" className="relative px-4 py-14 sm:py-20">
          <div className="container">
            <motion.div
              initial={{ opacity: 1, y: 16 }}
              whileInView={{ y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="mx-auto max-w-xl text-center"
            >
              <span className="text-sm font-bold uppercase tracking-widest text-brand-sky-700">What we clean</span>
              <h2 className="mt-2 font-display text-3xl font-extrabold text-slate-900 sm:text-4xl">
                Whatever needs cleaning, there&apos;s a fixed price for it
              </h2>
            </motion.div>
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {SERVICES.map((s, i) => (
                <ServiceCard
                  key={s.key}
                  icon={s.icon}
                  title={SERVICE_LABELS[s.key]}
                  description={s.description}
                  cta={s.cta}
                  href={`/booking/${s.key}`}
                  index={i}
                />
              ))}
            </div>
          </div>
        </section>

        {/* ── Pricing ────────────────────────────────────────────────── */}
        <section id="pricing" className="relative px-4 py-14 sm:py-20">
          <div className="container">
            <motion.div
              initial={{ opacity: 1, y: 16 }}
              whileInView={{ y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="mx-auto max-w-xl text-center"
            >
              <span className="text-sm font-bold uppercase tracking-widest text-brand-violet-700">Simple pricing</span>
              <h2 className="mt-2 font-display text-3xl font-extrabold text-slate-900 sm:text-4xl">
                £{hourlyRate} an hour. That&apos;s the whole price.
              </h2>
              <p className="mt-3 text-slate-700">No quote calls, no guesswork. Choose your hours — the total you see is exactly what you pay.</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 1, y: 22 }}
              whileInView={{ y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="glass-strong relative mx-auto mt-12 max-w-2xl overflow-hidden rounded-[2rem] p-8 shadow-[0_30px_60px_-20px_rgba(22,163,74,0.4)] sm:p-10"
            >
              <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-brand-green-400/40 blur-3xl" />
              <div className="absolute -bottom-10 -left-10 h-48 w-48 rounded-full bg-brand-violet-400/35 blur-3xl" />

              <div className="relative flex flex-col items-center text-center">
                <span className="flex items-center gap-2 rounded-full bg-brand-green-600/15 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-brand-green-800">
                  <Timer className="h-3.5 w-3.5" /> {minHours} hour minimum booking
                </span>
                <div className="mt-6 flex items-end gap-2">
                  <span className="font-display text-6xl font-extrabold tabular-nums text-brand-green-800 sm:text-7xl">
                    £{hourlyRate}
                  </span>
                  <span className="mb-2 font-display text-xl font-bold text-brand-green-800">/ hour</span>
                </div>

                <div className="mt-6 grid w-full gap-3 sm:grid-cols-3">
                  {[minHours, minHours + 1, minHours + 2].map((h) => (
                    <div key={h} className="glass rounded-2xl p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">{h} hours</p>
                      <p className="mt-1 font-display text-2xl font-extrabold text-slate-900">{money(price(h))}</p>
                      <p className="mt-0.5 text-xs text-slate-700">book for {money(Math.round(price(h) * depositPercentage) / 100)}</p>
                    </div>
                  ))}
                </div>

                <ul className="mt-6 grid w-full gap-2 text-left text-sm font-medium text-slate-800 sm:grid-cols-2">
                  {[
                    "Cleaner, equipment and checklist included",
                    "No travel fee, no deep-clean upcharge",
                    `Only ${depositPercentage}% to book — it comes off your total`,
                    "Move or cancel free up to 48 hours before",
                  ].map((t) => (
                    <li key={t} className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-green-700" /> {t}</li>
                  ))}
                </ul>

                <a
                  href="/booking/regular_cleaning"
                  className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-green-600 to-brand-green-500 px-6 py-4 font-display text-base font-bold text-white shadow-lg shadow-brand-green-500/50 transition-transform hover:scale-[1.02] sm:w-auto sm:px-10"
                >
                  Choose my hours <ArrowRight className="h-4 w-4" />
                </a>
                <p className="mt-4 text-xs text-slate-700">
                  Deep cleaning, end of tenancy, office &amp; after-builders are quoted individually, because every property&apos;s different — and that quote is fixed too.
                </p>
              </div>
            </motion.div>
          </div>
        </section>
      </div>

      {/* ── How it works ─────────────────────────────────────────────── */}
      <section id="how-it-works" className="relative px-4 py-16 sm:py-20">
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden>
          <GradientMesh />
        </div>
        <div className="container relative">
          <motion.div
            initial={{ opacity: 1, y: 16 }}
            whileInView={{ y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="mx-auto max-w-xl text-center"
          >
            <span className="text-sm font-bold uppercase tracking-widest text-brand-green-700">How it works</span>
            <h2 className="mt-2 font-display text-3xl font-extrabold text-slate-900 sm:text-4xl">
              From &ldquo;I need a clean&rdquo; to sparkling in 3 steps
            </h2>
          </motion.div>

          <div className="relative mt-14 grid gap-8 sm:grid-cols-3">
            <div className="absolute left-0 right-0 top-8 hidden h-px bg-gradient-to-r from-brand-green-400 via-brand-sky-400 to-brand-violet-400 sm:block" />
            {[
              { icon: Clock, title: "1. See your exact price", body: "Tell us about your home and pick your hours. Your fixed price appears instantly — no card, no obligation.", grad: "from-brand-green-500 to-brand-green-400" },
              { icon: CalendarCheck, title: `2. Lock in your date for ${depositPercentage}%`, body: "Pay a small deposit (it comes off your total) and your date is held. Your slot is only reserved once it's paid.", grad: "from-brand-sky-500 to-brand-sky-300" },
              { icon: Star, title: "3. Come home to clean", body: "A DBS-checked cleaner does the job. You pay the balance after the clean — and tell us if anything's not right.", grad: "from-brand-violet-500 to-brand-violet-300" },
            ].map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 1, y: 20 }}
                whileInView={{ y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="glass-strong relative z-10 flex flex-col items-center rounded-3xl p-7 text-center"
              >
                <span className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${step.grad} text-white shadow-lg`}>
                  <step.icon className="h-7 w-7" />
                </span>
                <h3 className="mt-5 font-display text-lg font-bold text-slate-900">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">{step.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ — the objections that stop people booking ───────────── */}
      <section id="faq" className="relative px-4 py-14 sm:py-20">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-sm font-bold uppercase tracking-widest text-brand-sky-700">Good questions</span>
            <h2 className="mt-2 font-display text-3xl font-extrabold text-slate-900 sm:text-4xl">Before you book, you might be wondering…</h2>
          </div>
          <div className="mx-auto mt-10 max-w-2xl space-y-3">
            {faqs.map((f) => (
              <details key={f.q} className="group glass-strong rounded-2xl px-5 py-4 open:shadow-lg">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-base font-bold text-slate-900 [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <ChevronDown className="h-5 w-5 shrink-0 text-brand-green-700 transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-3 text-[15px] leading-relaxed text-slate-700">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────── */}
      <section className="px-4 py-16 sm:py-20">
        <div className="container">
          <motion.div
            initial={{ opacity: 1, scale: 0.98 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-brand-green-800 via-brand-sky-700 to-brand-violet-700 px-8 py-16 text-center sm:px-16"
          >
            <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-white/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -right-10 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
            <CheckCircle2 className="relative mx-auto h-12 w-12 text-white" />
            <h2 className="relative mt-5 font-display text-3xl font-extrabold text-white sm:text-4xl">
              Get your weekends back
            </h2>
            <p className="relative mx-auto mt-3 max-w-md text-white">
              Your free time is worth more than a mop and bucket. See your exact price in 2 minutes — no card, no commitment, and free changes up to 48 hours before.
            </p>
            <a
              href="/booking/regular_cleaning"
              className="relative mt-8 inline-flex items-center gap-2 rounded-2xl bg-white px-8 py-4 font-display text-base font-bold text-brand-green-700 shadow-xl transition-transform hover:scale-[1.04]"
            >
              See my exact price <ArrowRight className="h-4 w-4" />
            </a>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
