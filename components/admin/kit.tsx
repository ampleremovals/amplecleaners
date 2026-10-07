import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { Avatar, Panel } from "@/components/admin/ui";
import { cn } from "@/lib/utils";

/* ═══ Shared page kit — every admin page is built from these, so they all look like the dashboard ═══ */

export const INPUT = "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-green-600 focus:ring-4 focus:ring-brand-green-100 disabled:bg-slate-50 disabled:text-slate-400";
export const TEXTAREA = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-green-600 focus:ring-4 focus:ring-brand-green-100";
export const LABEL = "mb-1.5 block text-xs font-medium text-slate-500";

/** Buttons on white surfaces. */
export const BTN = {
  primary: "inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-brand-green-700 px-4 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-brand-green-800 disabled:cursor-not-allowed disabled:opacity-60",
  secondary: "inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60",
  dark: "inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60",
  danger: "inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 text-[13px] font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:opacity-60",
  /** Icon-only square button for table rows. */
  icon: "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800 disabled:opacity-50",
};

/** Buttons that sit on the dark page header. */
export const HERO_BTN = {
  primary: "inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-white px-4 text-[13px] font-semibold text-brand-green-950 shadow-sm transition-colors hover:bg-brand-green-50 disabled:opacity-60",
  ghost: "inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 text-[13px] font-semibold text-white transition-colors hover:bg-white/20 disabled:opacity-60",
};

/** Table styling: hairline rows, quiet header, soft hover. */
export const TABLE = {
  table: "w-full text-sm",
  head: "border-b border-slate-100 bg-slate-50/70 text-left text-xs font-medium text-slate-500",
  th: "whitespace-nowrap px-5 py-3 font-medium",
  row: "border-b border-slate-100 last:border-0 transition-colors hover:bg-slate-50/70",
  td: "whitespace-nowrap px-5 py-3.5 align-middle",
};

export function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className={LABEL}>{label}</span>
      {children}
    </label>
  );
}

/** Page container: the same width and gutters as the dashboard. */
export function AdminPage({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-[1440px] space-y-6 px-4 py-6 sm:px-8 sm:py-8", className)}>{children}</div>;
}

export interface HeroStat { label: string; value: ReactNode; hint?: ReactNode; tone?: "default" | "warning" | "critical" | "positive" }
const STAT_HINT = { default: "text-white/60", warning: "font-medium text-amber-300", critical: "font-medium text-red-300", positive: "font-medium text-emerald-300" } as const;

/**
 * The dark page header used on every admin page: the same brand panel as the dashboard, smaller.
 * Title, a one-line description, actions on the right and (optionally) glass stat tiles underneath.
 */
export function AdminHero({
  eyebrow, title, description, back, actions, stats, children,
}: {
  eyebrow?: string; title: string; description?: ReactNode; back?: { href: string; label: string };
  actions?: ReactNode; stats?: HeroStat[]; children?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden rounded-[1.5rem] bg-brand-green-950 text-white shadow-[0_24px_60px_-30px_rgba(5,46,22,0.7)]">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -left-28 -top-32 h-[24rem] w-[24rem] rounded-full bg-brand-green-500/25 blur-[100px]" />
        <div className="absolute -right-20 -top-10 h-[20rem] w-[20rem] rounded-full bg-brand-sky-500/20 blur-[100px]" />
        <div className="absolute -bottom-40 left-1/3 h-[18rem] w-[18rem] rounded-full bg-brand-violet-500/15 blur-[110px]" />
        <div
          className="absolute inset-0 opacity-60"
          style={{
            backgroundImage: "radial-gradient(rgba(255,255,255,0.13) 1px, transparent 1px)",
            backgroundSize: "26px 26px",
            maskImage: "linear-gradient(to bottom, black 0%, transparent 85%)",
            WebkitMaskImage: "linear-gradient(to bottom, black 0%, transparent 85%)",
          }}
        />
      </div>
      <div className="relative p-5 sm:p-7">
        {back && (
          <Link href={back.href} className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-[13px] font-medium text-white/85 transition-colors hover:bg-white/20 hover:text-white">
            <ArrowLeft className="h-3.5 w-3.5" /> {back.label}
          </Link>
        )}
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
          <div className="min-w-0">
            {eyebrow && <p className="text-[13px] font-medium text-brand-green-200">{eyebrow}</p>}
            <h1 className="mt-1 text-balance text-[1.7rem] font-semibold leading-tight tracking-tight sm:text-[2rem]">{title}</h1>
            {description && <div className="mt-2 max-w-2xl text-[14px] leading-relaxed text-white/70">{description}</div>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
        {children}
        {stats && stats.length > 0 && (
          <div className={cn("mt-6 grid grid-cols-2 gap-3 [&>*:last-child:nth-child(odd)]:col-span-2", stats.length >= 4 ? "lg:grid-cols-4 lg:[&>*:last-child:nth-child(odd)]:col-span-1" : stats.length === 3 ? "sm:grid-cols-3 sm:[&>*:last-child:nth-child(odd)]:col-span-1" : "sm:[&>*:last-child:nth-child(odd)]:col-span-1")}>
            {stats.map((s) => (
              <div key={s.label} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-sm transition-colors hover:bg-white/[0.09]">
                <p className="text-[12.5px] font-medium text-white/60">{s.label}</p>
                <p className="mt-1.5 text-[1.5rem] font-semibold leading-none tracking-tight tabular-nums text-white">{s.value}</p>
                {s.hint && <p className={cn("mt-2 text-xs", STAT_HINT[s.tone ?? "default"])}>{s.hint}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/** A panel that holds a table: scrolls sideways on small screens instead of squashing columns. */
export function TableCard({ children, minWidth = 640 }: { children: ReactNode; minWidth?: number }) {
  return (
    <Panel className="overflow-hidden">
      <div className="overflow-x-auto"><div style={{ minWidth }}>{children}</div></div>
    </Panel>
  );
}

/** Avatar + primary text + secondary line: how a person or record is shown in a table row. */
export function PersonCell({ name, sub, href }: { name: string; sub?: ReactNode; href?: string }) {
  const body = (
    <>
      <Avatar name={name} size={34} />
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-slate-900">{name}</span>
        {sub && <span className="block truncate text-xs text-slate-500">{sub}</span>}
      </span>
    </>
  );
  return href
    ? <Link href={href} className="group flex items-center gap-3 hover:[&_span]:text-brand-green-800">{body}</Link>
    : <div className="flex items-center gap-3">{body}</div>;
}
