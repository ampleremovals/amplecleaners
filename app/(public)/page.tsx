import { Sparkles, Home, Building2, HardHat, Repeat, ShieldCheck, Clock, Star } from "lucide-react";
import { ServiceCard } from "@/components/shared/ServiceCard";
import { SERVICE_LABELS } from "@/types";

const SERVICES = [
  { key: "regular_cleaning", icon: Repeat, description: "Weekly, fortnightly or monthly — the same trusted cleaner every visit." },
  { key: "deep_cleaning", icon: Sparkles, description: "A thorough top-to-bottom clean, every room, every surface." },
  { key: "end_of_tenancy", icon: Home, description: "Get your full deposit back — checklist matched to agency standards." },
  { key: "office_cleaning", icon: Building2, description: "Flexible out-of-hours cleaning for offices and commercial space." },
  { key: "after_builders", icon: HardHat, description: "Dust, debris and mess cleared after renovation or building work." },
] as const;

export default function HomePage() {
  return (
    <div>
      <section className="bg-gradient-to-br from-brand-teal-50 via-white to-brand-sky-50 px-4 py-20 sm:py-28">
        <div className="container text-center">
          <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-brand-teal-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand-teal-800">
            <ShieldCheck className="h-3.5 w-3.5" /> Vetted, DBS-checked cleaners
          </span>
          <h1 className="mx-auto max-w-3xl font-display text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            Professional cleaning, <span className="text-gradient-sky">booked in minutes</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-slate-500">
            Fixed price, no hidden fees. Pay a small deposit to secure your slot — the rest isn&apos;t due until the job&apos;s done.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a href="/booking/regular_cleaning" className="rounded-xl bg-brand-teal-700 px-6 py-3 font-bold text-white shadow-lg shadow-brand-teal-200 hover:bg-brand-teal-800">
              Get a free quote
            </a>
            <a href="tel:03330000000" className="rounded-xl border-2 border-slate-200 bg-white px-6 py-3 font-bold text-slate-700 hover:border-brand-teal-300">
              Call 0333 000 0000
            </a>
          </div>
        </div>
      </section>

      <section id="services" className="px-4 py-16">
        <div className="container">
          <h2 className="text-center font-display text-3xl font-extrabold text-slate-900">Our services</h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((s) => (
              <ServiceCard
                key={s.key}
                icon={s.icon}
                title={SERVICE_LABELS[s.key]}
                description={s.description}
                href={`/booking/${s.key}`}
              />
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="bg-slate-50 px-4 py-16">
        <div className="container grid gap-8 sm:grid-cols-3">
          {[
            { icon: Clock, title: "1. Get your quote", body: "Tell us about your property — get a fixed price instantly." },
            { icon: ShieldCheck, title: "2. Secure your date", body: "A small deposit locks in your cleaner and time slot." },
            { icon: Star, title: "3. Enjoy a spotless space", body: "Your vetted cleaner arrives, does the job, you rate the result." },
          ].map((step) => (
            <div key={step.title} className="text-center">
              <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-teal-100 text-brand-teal-700">
                <step.icon className="h-7 w-7" />
              </span>
              <h3 className="font-display text-lg font-bold text-slate-900">{step.title}</h3>
              <p className="mt-2 text-sm text-slate-500">{step.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
