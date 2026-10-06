import type { ReactNode } from "react";
import { BOOKING_STATUS_LABELS, type BookingStatus } from "@/types";
import { stageOf, type PipelineStage } from "@/lib/pipeline";
import { cn } from "@/lib/utils";

/** Page title block: one h1, a quiet description, optional actions on the right. */
export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        <h1 className="text-[1.65rem] font-semibold leading-tight text-slate-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

/** The one surface used everywhere: white, hairline border, 12px radius, almost no shadow. */
export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("min-w-0 rounded-xl border border-slate-200/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]", className)}>{children}</section>;
}

export function PanelHeader({ title, hint, right }: { title: string; hint?: ReactNode; right?: ReactNode }) {
  return (
    <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
      </div>
      {right}
    </header>
  );
}

type Tone = "neutral" | "info" | "positive" | "warning" | "critical";
const TONES: Record<Tone, { pill: string; dot: string }> = {
  neutral: { pill: "bg-slate-100 text-slate-700", dot: "bg-slate-400" },
  info: { pill: "bg-sky-50 text-sky-800", dot: "bg-sky-500" },
  positive: { pill: "bg-emerald-50 text-emerald-800", dot: "bg-emerald-500" },
  warning: { pill: "bg-amber-50 text-amber-800", dot: "bg-amber-500" },
  critical: { pill: "bg-red-50 text-red-800", dot: "bg-red-500" },
};

export function Pill({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  const t = TONES[tone];
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium", t.pill)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", t.dot)} aria-hidden />
      {children}
    </span>
  );
}

const STAGE_TONE: Record<PipelineStage["key"], Tone> = {
  new: "neutral", quoted: "info", confirmed: "positive", in_progress: "warning", completed: "positive", lost: "critical",
};

/** A booking status as a coloured pill — colour comes from the pipeline stage, so it always matches the board. */
export function StatusBadge({ status }: { status: BookingStatus }) {
  return <Pill tone={STAGE_TONE[stageOf(status)]}>{BOOKING_STATUS_LABELS[status]}</Pill>;
}

/** Initials in a neutral circle — a person without needing a photo. */
export function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200"
      style={{ width: size, height: size }}
      aria-hidden
    >
      {initials || "?"}
    </span>
  );
}
