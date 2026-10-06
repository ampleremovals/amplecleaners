import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface Crumb { label: string; href?: string }

/** Content width shared by the hero and the body below it, so their left edges line up. */
export const PAGE_WIDTH = { narrow: "max-w-3xl", normal: "max-w-4xl", wide: "max-w-5xl" } as const;

/**
 * The deep-green header band used by every content page (service/area pages, guides, blog, legal),
 * carrying the homepage's look onto them. One h1, an optional breadcrumb and lead, and an actions slot.
 * Prints as a plain header, so printable guide checklists stay clean.
 */
export function PageHero({
  crumbs, eyebrow, title, lead, children, width = "normal",
}: {
  crumbs?: Crumb[];
  eyebrow?: string;
  title: string;
  lead?: ReactNode;
  children?: ReactNode;
  width?: keyof typeof PAGE_WIDTH;
}) {
  return (
    <section className="relative overflow-hidden bg-brand-green-950 px-4 pb-12 pt-7 text-white sm:pb-16 sm:pt-10 print:bg-white print:px-0 print:py-4 print:text-slate-900">
      <div className="pointer-events-none absolute inset-0 print:hidden" aria-hidden>
        <div className="absolute -left-32 -top-32 h-[26rem] w-[26rem] rounded-full bg-brand-green-500/25 blur-[100px]" />
        <div className="absolute -right-32 top-0 h-[24rem] w-[24rem] rounded-full bg-brand-sky-500/20 blur-[100px]" />
        <div className="absolute -bottom-40 left-1/3 h-[22rem] w-[22rem] rounded-full bg-brand-violet-500/15 blur-[110px]" />
        <div
          className="absolute inset-0 opacity-60"
          style={{
            backgroundImage: "radial-gradient(rgba(255,255,255,0.13) 1px, transparent 1px)",
            backgroundSize: "26px 26px",
            maskImage: "linear-gradient(to bottom, black 0%, transparent 90%)",
            WebkitMaskImage: "linear-gradient(to bottom, black 0%, transparent 90%)",
          }}
        />
      </div>

      <div className={cn("relative mx-auto w-full", PAGE_WIDTH[width])}>
        {crumbs && crumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="print:hidden">
            <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] text-brand-green-100">
              {crumbs.map((c, i) => (
                <li key={c.label} className="flex items-center gap-1.5">
                  {i > 0 && <ChevronRight className="h-3.5 w-3.5 opacity-60" aria-hidden />}
                  {c.href ? <Link href={c.href} className="hover:text-white hover:underline">{c.label}</Link> : <span aria-current="page" className="font-semibold text-white">{c.label}</span>}
                </li>
              ))}
            </ol>
          </nav>
        )}
        {eyebrow && (
          <span className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-brand-green-100 print:hidden">
            <span className="h-2 w-2 rounded-full bg-brand-green-400" aria-hidden />{eyebrow}
          </span>
        )}
        <h1 className={cn("text-balance font-display text-[1.85rem] font-bold leading-[1.12] tracking-tight text-white sm:text-[2.6rem] print:text-slate-900", crumbs?.length || eyebrow ? "mt-4" : "")}>{title}</h1>
        {lead && <div className="mt-4 max-w-2xl text-base leading-relaxed text-brand-green-50 sm:text-lg print:text-slate-700">{lead}</div>}
        {children && <div className="mt-7 print:hidden">{children}</div>}
      </div>
    </section>
  );
}

/** A white page body that sits under the hero, at the same width. */
export function PageBody({ children, width = "normal", className }: { children: ReactNode; width?: keyof typeof PAGE_WIDTH; className?: string }) {
  return (
    <div className="bg-white px-4 py-12 sm:py-16 print:px-0 print:py-4">
      <div className={cn("mx-auto w-full", PAGE_WIDTH[width], className)}>{children}</div>
    </div>
  );
}

/** Section heading: one style everywhere. */
export function H2({ children, className }: { children: ReactNode; className?: string }) {
  return <h2 className={cn("text-balance font-display text-[1.4rem] font-bold leading-snug tracking-tight text-slate-900 sm:text-[1.65rem]", className)}>{children}</h2>;
}

/** A link shown as a quiet pill — used for the long lists of areas and services. */
export function Chip({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-800 transition-colors hover:border-brand-green-400 hover:bg-brand-green-50 hover:text-brand-green-800">
      {children}
    </Link>
  );
}

/** Deep-green closing call to action, the same block the homepage ends with. */
export function CtaBand({ title, text, href, label, secondary }: { title: string; text: string; href: string; label: string; secondary?: { href: string; label: string } }) {
  return (
    <section className="relative overflow-hidden rounded-[2rem] bg-brand-green-950 px-6 py-10 text-center text-white sm:px-12 sm:py-14 print:hidden">
      <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-brand-green-500/30 blur-[80px]" aria-hidden />
      <div className="pointer-events-none absolute -bottom-24 -right-16 h-64 w-64 rounded-full bg-brand-violet-500/25 blur-[80px]" aria-hidden />
      <h2 className="relative text-balance font-display text-[1.5rem] font-bold leading-tight tracking-tight sm:text-3xl">{title}</h2>
      <p className="relative mx-auto mt-3 max-w-lg text-base text-brand-green-50">{text}</p>
      <div className="relative mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link href={href} className="inline-flex w-full items-center justify-center rounded-2xl bg-white px-8 py-4 font-display text-[0.95rem] font-bold text-brand-green-900 shadow-xl transition hover:bg-brand-green-50 sm:w-auto">{label}</Link>
        {secondary && <Link href={secondary.href} className="inline-flex w-full items-center justify-center rounded-2xl border border-white/30 px-8 py-4 font-display text-[0.95rem] font-bold text-white transition hover:bg-white/10 sm:w-auto">{secondary.label}</Link>}
      </div>
    </section>
  );
}

/** The one primary button used on content pages (on the dark hero it is white; on white it is green). */
export function HeroButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-7 py-4 font-display text-[0.95rem] font-bold text-brand-green-900 shadow-xl shadow-black/20 transition hover:bg-brand-green-50">
      {children}
    </Link>
  );
}
