"use client";

import { cn } from "@/lib/utils";

/** An on/off switch. `label` is read by screen readers. */
export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <label className={cn("relative inline-flex shrink-0 cursor-pointer", disabled && "cursor-not-allowed opacity-60")}>
      <input type="checkbox" role="switch" aria-label={label} checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span className="h-6 w-11 rounded-full bg-slate-200 transition-colors peer-checked:bg-brand-green-700 peer-focus-visible:ring-4 peer-focus-visible:ring-brand-green-100" aria-hidden />
      <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" aria-hidden />
    </label>
  );
}

/** 0 → "straight away", 3 → "3 hours", 192 → "8 days". */
export function humanHours(h: number): string {
  if (h <= 0) return "straight away";
  if (h < 1) return `${Math.round(h * 60)} minutes`;
  if (h < 48) return `${h} hour${h === 1 ? "" : "s"}`;
  const d = Math.round((h / 24) * 10) / 10;
  return `${d} days`;
}

export const pct = (n: number, d: number) => (d > 0 ? `${Math.round((n / d) * 100)}%` : "–");

export function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "–";
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" }).format(new Date(iso));
}

export interface ArmStat { sent: number; opened: number; clicked: number }
export interface TemplateStat { key: string; sent: number; delivered: number; opened: number; clicked: number; bounced: number; variants?: { A: ArmStat; B: ArmStat } }
