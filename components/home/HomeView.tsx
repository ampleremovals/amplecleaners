"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Sparkles, Home, Building2, HardHat, Repeat, ShieldCheck, Clock, Star, ChevronDown, CheckCircle2,
  ArrowRight, BadgeCheck, CalendarCheck, Wallet, CalendarClock, Tag, Minus, Plus, Phone,
} from "lucide-react";
import { ServiceCard } from "@/components/shared/ServiceCard";
import { AreasSection } from "@/components/seo/AreasSection";
import { SERVICE_LABELS } from "@/types";
import { usePricing } from "@/components/shared/PricingProvider";
import { useAttributionQuery } from "@/components/shared/attribution";

const money = (n: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 }).format(n);

const SERVICES = [
  { key: "regular_cleaning", icon: Repeat, cta: "See my price", description: "Weekly, fortnightly or monthly — the same cleaner wherever possible, billed after every visit. No contract, stop any time." },
  { key: "deep_cleaning", icon: Sparkles, cta: "Get my fixed price", description: "Every room, every surface, top to bottom — inside the oven and fridge, and the grime you've stopped noticing." },
  { key: "end_of_tenancy", icon: Home, cta: "Get my fixed price", description: "Get your full deposit back — a clean built around your check-out list, so you hand the keys back with confidence." },
  { key: "office_cleaning", icon: Building2, cta: "Get my fixed price", description: "Out-of-hours cleaning, so your team walks into a fresh, professional space every morning." },
  { key: "after_builders", icon: HardHat, cta: "Get my fixed price", description: "Dust, residue and plaster-dust cleared — so your finished space is actually ready to enjoy." },
] as const;

// No opacity dip — text/buttons never fully disappear, even for a slow
// hydration, just slides up gently into place.
const fadeUp = {
  hidden: { opacity: 1, y: 22 },
  show: { opacity: 1, y: 0 },
};
const EASE = [0.22, 1, 0.36, 1] as const;
const MAX_HOURS = 8;

export type HeroVariant = "a" | "b";

/**
 * The ONLY thing that differs between the two test versions is the hero copy. A is the control
 * (price-led); B is outcome-led. Layout and everything below the hero are identical so the test is clean.
 */
function heroCopy(variant: HeroVariant, startPrice: number, depositPercentage: number) {
  if (variant === "b") {
    return {
      // Non-breaking spaces keep "from £45" together (and the dash attached) so the headline never orphans a word.
      headline: `Get your weekends back. Fixed-price cleaning from ${money(startPrice)}`,
      sub: `No quote calls, no chasing, no surprises. See your exact price in 2 minutes, pay just ${depositPercentage}% to lock in your date, and come home to a spotless house.`,
      cta: "Check my price",
    };
  }
  return {
    headline: `Come home to a spotless house — from ${money(startPrice)}`,
    sub: `Choose your hours, see your exact price instantly, and pay just ${depositPercentage}% to lock in your date. A DBS-checked cleaner does the rest — and you only pay the balance once the job's done.`,
    cta: "See my exact price",
  };
}

function SectionHead({ eyebrow, title, sub }: { eyebrow: string; title: React.ReactNode; sub?: string }) {
  return (
    <motion.div
      initial={{ opacity: 1, y: 16 }}
      whileInView={{ y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className="mx-auto max-w-2xl text-center"
    >
      <span className="text-xs font-bold uppercase tracking-[0.18em] text-brand-green-700">{eyebrow}</span>
      <h2 className="mt-3 text-balance font-display text-[1.65rem] font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl">{title}</h2>
      {sub && <p className="mt-4 text-base text-slate-600 sm:text-lg">{sub}</p>}
    </motion.div>
  );
}

/** The instant-price calculator: the product itself is the hero image. */
function PriceCalculator({ cta, bookingBase, attr }: { cta: string; bookingBase: string; attr: string }) {
  const { hourlyRate, minHours, depositPercentage, price } = usePricing();
  const [hours, setHours] = useState(minHours);
  const total = price(hours);
  const deposit = Math.round(total * depositPercentage) / 100;
  const balance = Math.round((total - deposit) * 100) / 100;
  const href = `${bookingBase}${attr ? `${attr}&` : "?"}hours=${hours}`;

  return (
    <div className="relative rounded-[1.75rem] bg-white p-5 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.55)] ring-1 ring-white/20 sm:p-7">
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 rounded-full bg-brand-green-100 px-3 py-1.5 text-xs font-bold text-brand-green-900">
          <Repeat className="h-3.5 w-3.5" /> Home cleaning
        </span>
        <span className="text-sm font-semibold text-slate-600">{money(hourlyRate)} per hour</span>
      </div>

      <p className="mt-5 text-sm font-bold text-slate-900" id="hours-label">How many hours do you need?</p>
      <div className="mt-2 flex items-center justify-between gap-3 rounded-2xl bg-slate-100 p-1.5" role="group" aria-labelledby="hours-label">
        <button
          type="button"
          onClick={() => setHours((h) => Math.max(minHours, h - 1))}
          disabled={hours <= minHours}
          aria-label="One hour less"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-slate-900 shadow-sm transition active:scale-95 enabled:hover:text-brand-green-700 disabled:opacity-40"
        >
          <Minus className="h-5 w-5" />
        </button>
        <div className="text-center" aria-live="polite">
          <span className="font-display text-2xl font-bold tabular-nums text-slate-900">{hours}</span>
          <span className="ml-1.5 text-sm font-semibold text-slate-600">hours</span>
        </div>
        <button
          type="button"
          onClick={() => setHours((h) => Math.min(MAX_HOURS, h + 1))}
          disabled={hours >= MAX_HOURS}
          aria-label="One hour more"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-slate-900 shadow-sm transition active:scale-95 enabled:hover:text-brand-green-700 disabled:opacity-40"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>
      <p className="mt-2 text-xs text-slate-600">{minHours} hours minimum. Need more than {MAX_HOURS}? Choose it on the next step.</p>

      <div className="mt-5 flex items-end justify-between gap-4 border-t border-slate-200 pt-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-600">Your fixed price</p>
          <motion.p key={total} initial={{ y: 8 }} animate={{ y: 0 }} transition={{ duration: 0.25 }} className="font-display text-5xl font-bold leading-none tabular-nums text-slate-900">
            {money(total)}
          </motion.p>
        </div>
        <p className="pb-1 text-right text-xs font-medium leading-snug text-slate-600">No extras<br />on the day</p>
      </div>

      <dl className="mt-5 space-y-2 rounded-2xl bg-brand-green-50 p-4 text-sm">
        <div className="flex items-center justify-between gap-3">
          <dt className="font-semibold text-brand-green-900">To lock in your date ({depositPercentage}%)</dt>
          <dd className="font-display text-base font-bold tabular-nums text-brand-green-900">{money(deposit)}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-slate-700">Balance, after the clean</dt>
          <dd className="font-semibold tabular-nums text-slate-900">{money(balance)}</dd>
        </div>
      </dl>

      <a
        href={href}
        className="group mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-green-700 px-6 py-4 font-display text-[0.95rem] font-bold text-white shadow-lg shadow-brand-green-900/30 transition hover:bg-brand-green-800 active:scale-[0.99]"
      >
        {cta}
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </a>
      <p className="mt-3 text-center text-xs font-medium text-slate-600">Takes about 2 minutes · No card needed to see your price</p>
    </div>
  );
}

export function HomeView({ variant = "a" }: { variant?: HeroVariant }) {
  const { hourlyRate, minHours, depositPercentage, price, rating } = usePricing();
  const startPrice = price(minHours);
  const hero = heroCopy(variant, startPrice, depositPercentage);
  const attr = useAttributionQuery();
  const bookingHref = `/booking/regular_cleaning${attr}`;

  // Mobile sticky "See my price" bar: shown once the hero card has scrolled away, hidden again at the final CTA / footer.
  const heroCardRef = useRef<HTMLDivElement>(null);
  const finalCtaRef = useRef<HTMLElement>(null);
  const [heroVisible, setHeroVisible] = useState(true);
  const [finalVisible, setFinalVisible] = useState(false);
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const watch = (el: Element | null, set: (v: boolean) => void) => {
      if (!el) return undefined;
      const io = new IntersectionObserver(([e]) => set(e.isIntersecting), { threshold: 0 });
      io.observe(el);
      return io;
    };
    const a = watch(heroCardRef.current, setHeroVisible);
    const b = watch(finalCtaRef.current, setFinalVisible);
    return () => { a?.disconnect(); b?.disconnect(); };
  }, []);
  const showStickyBar = !heroVisible && !finalVisible;

  const trust = [
    { icon: ShieldCheck, title: "DBS-checked & fully insured", body: "Every cleaner is vetted before they're matched to you." },
    { icon: BadgeCheck, title: "Fixed price, zero surprises", body: "The price you see is the price you pay." },
    { icon: Wallet, title: `Only ${depositPercentage}% to book`, body: "It comes off your total. The rest is after the clean." },
    { icon: CalendarClock, title: "Free changes up to 48h", body: "Move or cancel in a couple of taps." },
  ];

  const faqs = [
    { q: "How is my price worked out?", a: `Regular Cleaning is £${hourlyRate} per hour with a ${minHours}-hour minimum. You choose your hours and see the exact total before you commit — it doesn't change on the day. Deep, end of tenancy, office and after-builders cleans are quoted individually because every property is different, and the quote is fixed too.` },
    { q: "When do I pay?", a: `You pay just ${depositPercentage}% to lock in your date — and that comes off your total, it's not an extra. The rest is invoiced after the clean, once you can see the result. Pay by card or by bank transfer (no card fee).` },
    { q: "Are your cleaners vetted?", a: "Every cleaner is DBS-checked before they're ever matched to a job, and we're fully insured. You'll know who's coming — we tell you your cleaner's first name before the day." },
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
    <div className="overflow-x-clip bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      {/* ── Hero: deep green, maximum contrast, the price calculator IS the visual ── */}
      <section className="relative overflow-hidden bg-brand-green-950 px-4 pb-24 pt-7 text-white sm:pb-28 sm:pt-16 lg:pb-32 lg:pt-20">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute -left-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-brand-green-500/25 blur-[110px]" />
          <div className="absolute -right-40 top-10 h-[30rem] w-[30rem] rounded-full bg-brand-sky-500/20 blur-[110px]" />
          <div className="absolute -bottom-48 left-1/3 h-[28rem] w-[28rem] rounded-full bg-brand-violet-500/20 blur-[120px]" />
          <div
            className="absolute inset-0 opacity-70"
            style={{
              backgroundImage: "radial-gradient(rgba(255,255,255,0.14) 1px, transparent 1px)",
              backgroundSize: "26px 26px",
              maskImage: "linear-gradient(to bottom, black 0%, transparent 85%)",
              WebkitMaskImage: "linear-gradient(to bottom, black 0%, transparent 85%)",
            }}
          />
          <Sparkles className="absolute left-[8%] top-10 hidden h-8 w-8 text-brand-sky-300/60 lg:block" />
          <Sparkles className="absolute left-[46%] top-24 hidden h-5 w-5 text-brand-green-300/60 lg:block" />
          <Sparkles className="absolute bottom-24 left-[42%] hidden h-6 w-6 text-brand-violet-300/60 lg:block" />
        </div>

        <div className="container relative grid items-center gap-7 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.08 } } }}
            className="text-center lg:text-left"
          >
            <motion.span
              variants={fadeUp}
              transition={{ duration: 0.45, ease: EASE }}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-brand-green-100"
            >
              <span className="h-2 w-2 rounded-full bg-brand-green-400" aria-hidden />
              Cleaners in Barking, Dagenham &amp; Romford
            </motion.span>

            <motion.h1
              variants={fadeUp}
              transition={{ duration: 0.5, ease: EASE }}
              className="mt-4 text-balance font-display text-[1.85rem] font-bold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-[3.35rem]"
            >
              {hero.headline}
            </motion.h1>

            <motion.p
              variants={fadeUp}
              transition={{ duration: 0.45, delay: 0.04 }}
              className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-brand-green-50 sm:mt-5 sm:text-lg lg:mx-0"
            >
              {hero.sub}
            </motion.p>

            <motion.div
              variants={fadeUp}
              transition={{ duration: 0.45, delay: 0.08 }}
              className="mt-7 hidden flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm font-semibold text-white sm:flex lg:justify-start"
            >
              {[
                { icon: ShieldCheck, label: "DBS-checked & fully insured" },
                { icon: CalendarClock, label: "Free changes up to 48h" },
              ].map((t) => (
                <span key={t.label} className="inline-flex items-center gap-2">
                  <t.icon className="h-4 w-4 text-brand-green-300" /> {t.label}
                </span>
              ))}
              {rating && (
                <span className="inline-flex items-center gap-2">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  {rating.average.toFixed(1)} from {rating.count} customer reviews
                </span>
              )}
            </motion.div>

            <motion.div variants={fadeUp} transition={{ duration: 0.45, delay: 0.12 }} className="mt-7 hidden lg:block">
              <a
                href="tel:03330000000"
                className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-5 py-3 font-display text-sm font-bold text-white transition hover:bg-white/10"
              >
                <Phone className="h-4 w-4" /> Prefer to talk? Call 0333 000 0000
              </a>
            </motion.div>
          </motion.div>

          <motion.div
            ref={heroCardRef}
            initial={{ opacity: 1, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease: EASE }}
            className="mx-auto w-full max-w-md lg:max-w-none"
          >
            <PriceCalculator cta={hero.cta} bookingBase="/booking/regular_cleaning" attr={attr} />
            <p className="mt-4 text-center text-sm text-brand-green-100 lg:hidden">
              Prefer to talk? <a href="tel:03330000000" className="font-bold text-white underline underline-offset-2">Call 0333 000 0000</a>
            </p>
            <p className="mt-4 hidden text-center text-sm text-brand-green-100 lg:block">
              Deep clean, end of tenancy, office or after builders? <a href="#services" className="font-bold text-white underline underline-offset-2">Get a fixed quote</a>
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── Trust band: overlaps the hero edge ───────────────────────────────── */}
      <section className="relative z-10 -mt-12 px-4 sm:-mt-14">
        <div className="container">
          {/* gap-px over a slate background draws the dividers at every breakpoint without per-cell border logic */}
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-slate-200 bg-slate-200 shadow-[0_25px_60px_-25px_rgba(15,23,42,0.35)] lg:grid-cols-4">
            {trust.map((t) => (
              <div key={t.title} className="flex flex-col items-start gap-3 bg-white p-4 sm:flex-row sm:gap-3.5 sm:p-6">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-green-100 text-brand-green-800 sm:h-11 sm:w-11">
                  <t.icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-display text-[0.8rem] font-bold leading-snug text-slate-900 sm:text-[0.92rem]">{t.title}</p>
                  <p className="mt-1 hidden text-sm leading-snug text-slate-600 sm:block">{t.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── The problem we solve ───────────────────────────────────── */}
      <section className="px-4 py-16 sm:py-24">
        <div className="container">
          <SectionHead
            eyebrow="Sound familiar?"
            title="Hiring a cleaner shouldn't feel like a gamble"
            sub="Vague quotes that grow on the day. Strangers you know nothing about. Paying everything upfront for a job you can't judge yet. We built Ample Cleaners to take every one of those worries away."
          />
          <div className="mx-auto mt-12 grid max-w-5xl gap-5 sm:grid-cols-3">
            {[
              { icon: Tag, tint: "bg-brand-green-100 text-brand-green-800", title: "The price you see is the price you pay", body: "Pick your hours and your total appears instantly. No \"it depends\", no extras on the day, no travel fee." },
              { icon: ShieldCheck, tint: "bg-brand-sky-100 text-brand-sky-700", title: "Cleaners you can trust in your home", body: "Every cleaner is DBS-checked before they're matched to you — and you'll know their first name before they arrive." },
              { icon: Wallet, tint: "bg-brand-violet-100 text-brand-violet-700", title: "You pay the balance after the clean", body: `Just ${depositPercentage}% secures your date (and comes off your total). The rest is due once the job's done and you've seen the result.` },
            ].map((c, i) => (
              <motion.div
                key={c.title}
                initial={{ opacity: 1, y: 20 }}
                whileInView={{ y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${c.tint}`}><c.icon className="h-6 w-6" /></span>
                <h3 className="mt-5 font-display text-base font-bold leading-snug text-slate-900">{c.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{c.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Services ───────────────────────────────────────────────── */}
      <section id="services" className="scroll-mt-20 bg-slate-50 px-4 py-16 sm:py-24">
        <div className="container">
          <SectionHead eyebrow="What we clean" title="Whatever needs cleaning, there's a fixed price for it" />
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((s, i) => (
              <ServiceCard
                key={s.key}
                icon={s.icon}
                title={SERVICE_LABELS[s.key]}
                description={s.description}
                cta={s.cta}
                href={`/booking/${s.key}${attr}`}
                index={i}
                featured={i === 0}
                badge={i === 0 ? `From ${money(startPrice)}` : undefined}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ────────────────────────────────────────────────── */}
      <section id="pricing" className="scroll-mt-20 px-4 py-16 sm:py-24">
        <div className="container grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <motion.div initial={{ opacity: 1, y: 16 }} whileInView={{ y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }}>
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-brand-green-700">Simple pricing</span>
            <h2 className="mt-3 text-balance font-display text-[1.65rem] font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl">
              £{hourlyRate} an hour. That&apos;s the whole price.
            </h2>
            <p className="mt-4 text-base text-slate-600 sm:text-lg">No quote calls, no guesswork. Choose your hours — the total you see is exactly what you pay.</p>
            <ul className="mt-6 space-y-3 text-[15px] font-medium text-slate-800">
              {[
                "Cleaner, equipment and checklist included",
                "No travel fee, no deep-clean upcharge",
                `Only ${depositPercentage}% to book — it comes off your total`,
                "Move or cancel free up to 48 hours before",
              ].map((t) => (
                <li key={t} className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-green-700" /> {t}</li>
              ))}
            </ul>
            <a
              href={bookingHref}
              className="group mt-8 inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-green-700 px-8 py-4 font-display text-[0.95rem] font-bold text-white shadow-lg shadow-brand-green-700/25 transition hover:bg-brand-green-800"
            >
              Choose my hours <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 1, y: 22 }}
            whileInView={{ y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: EASE }}
            className="min-w-0 rounded-[2rem] border border-slate-200 bg-slate-50 p-5 sm:p-8"
          >
            <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
              <div className="flex items-end gap-2">
                <span className="font-display text-5xl font-bold leading-none tabular-nums text-brand-green-800 sm:text-6xl">£{hourlyRate}</span>
                <span className="whitespace-nowrap pb-1 font-display text-lg font-bold text-brand-green-800">/ hour</span>
              </div>
              <span className="whitespace-nowrap rounded-full bg-brand-green-100 px-3 py-1.5 text-xs font-bold text-brand-green-900">{minHours} hour minimum</span>
            </div>
            <div className="mt-6 divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white">
              {[minHours, minHours + 1, minHours + 2].map((h) => (
                <div key={h} className="flex items-center justify-between gap-4 px-5 py-4">
                  <div>
                    <p className="font-display text-sm font-bold text-slate-900">{h} hours</p>
                    <p className="mt-0.5 text-xs text-slate-600">book for {money(Math.round(price(h) * depositPercentage) / 100)}</p>
                  </div>
                  <p className="font-display text-2xl font-bold tabular-nums text-slate-900">{money(price(h))}</p>
                </div>
              ))}
            </div>
            <p className="mt-5 text-xs leading-relaxed text-slate-600">
              Deep cleaning, end of tenancy, office &amp; after-builders are quoted individually, because every property&apos;s different — and that quote is fixed too.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────── */}
      <section id="how-it-works" className="scroll-mt-20 bg-slate-50 px-4 py-16 sm:py-24">
        <div className="container">
          <SectionHead eyebrow="How it works" title="From “I need a clean” to sparkling in 3 steps" />
          <div className="relative mx-auto mt-14 grid max-w-5xl gap-5 sm:grid-cols-3">
            {[
              { icon: Clock, title: "See your exact price", body: "Tell us about your home and pick your hours. Your fixed price appears instantly — no card, no obligation." },
              { icon: CalendarCheck, title: `Lock in your date for ${depositPercentage}%`, body: "Pay a small deposit (it comes off your total) and your date is held. Popular slots fill up, and yours is only reserved once the deposit's paid." },
              { icon: Star, title: "Come home to clean", body: "A DBS-checked cleaner does the job. You pay the balance after the clean — and tell us if anything's not right." },
            ].map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 1, y: 20 }}
                whileInView={{ y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="relative rounded-3xl border border-slate-200 bg-white p-6 pt-9 shadow-sm"
              >
                <span className="absolute -top-5 left-6 flex h-10 w-10 items-center justify-center rounded-full bg-brand-green-700 font-display text-base font-bold text-white shadow-lg shadow-brand-green-700/30 ring-4 ring-slate-50">
                  {i + 1}
                </span>
                <step.icon className="h-6 w-6 text-brand-green-700" />
                <h3 className="mt-3 font-display text-base font-bold leading-snug text-slate-900">{step.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{step.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ — the objections that stop people booking ───────────── */}
      <section id="faq" className="scroll-mt-20 px-4 py-16 sm:py-24">
        <div className="container">
          <SectionHead eyebrow="Good questions" title="Before you book, you might be wondering…" />
          <div className="mx-auto mt-10 max-w-2xl space-y-3">
            {faqs.map((f) => (
              <details key={f.q} className="group rounded-2xl border border-slate-200 bg-white px-5 py-4 transition-shadow open:border-brand-green-300 open:shadow-md">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-[0.95rem] font-bold leading-snug text-slate-900 [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <ChevronDown className="h-5 w-5 shrink-0 text-brand-green-700 transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-3 text-[15px] leading-relaxed text-slate-600">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <div className="bg-slate-50">
        <AreasSection />
      </div>

      {/* ── Final CTA ────────────────────────────────────────────────── */}
      <section ref={finalCtaRef} className="px-4 pb-2 pt-16 sm:pt-24">
        <div className="container">
          <motion.div
            initial={{ opacity: 1, scale: 0.98 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: EASE }}
            className="relative overflow-hidden rounded-[2.5rem] bg-brand-green-950 px-6 py-14 text-center sm:px-16 sm:py-20"
          >
            <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-brand-green-500/30 blur-[90px]" aria-hidden />
            <div className="pointer-events-none absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-brand-violet-500/25 blur-[90px]" aria-hidden />
            <div className="pointer-events-none absolute right-1/4 top-0 h-48 w-48 rounded-full bg-brand-sky-500/20 blur-[80px]" aria-hidden />
            <h2 className="relative text-balance font-display text-[1.75rem] font-bold leading-tight tracking-tight text-white sm:text-4xl">
              Get your weekends back
            </h2>
            <p className="relative mx-auto mt-4 max-w-md text-base text-brand-green-50 sm:text-lg">
              Your free time is worth more than a mop and bucket. See your exact price in 2 minutes — no card, no commitment, and free changes up to 48 hours before.
            </p>
            <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a
                href={bookingHref}
                className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-8 py-4 font-display text-[0.95rem] font-bold text-brand-green-900 shadow-xl transition hover:bg-brand-green-50 sm:w-auto"
              >
                See my exact price <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </a>
              <a
                href="tel:03330000000"
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/30 px-8 py-4 font-display text-[0.95rem] font-bold text-white transition hover:bg-white/10 sm:w-auto"
              >
                <Phone className="h-4 w-4" /> Call 0333 000 0000
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Mobile sticky bar ────────────────────────────────────────── */}
      <div
        aria-hidden={!showStickyBar}
        className={`fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 pt-3 shadow-[0_-10px_30px_-12px_rgba(15,23,42,0.25)] backdrop-blur transition-transform duration-300 lg:hidden pb-[max(0.75rem,env(safe-area-inset-bottom))] ${showStickyBar ? "translate-y-0" : "pointer-events-none translate-y-full"}`}
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm leading-tight text-slate-600">
            <span className="block font-display text-base font-bold text-slate-900">From {money(startPrice)}</span>
            fixed price · {depositPercentage}% to book
          </p>
          <a
            href={bookingHref}
            tabIndex={showStickyBar ? 0 : -1}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-brand-green-700 px-5 py-3 font-display text-sm font-bold text-white shadow-md transition active:scale-95"
          >
            See my price <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </div>
  );
}
