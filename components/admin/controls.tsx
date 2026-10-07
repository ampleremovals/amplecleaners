"use client";

import { cn } from "@/lib/utils";

/** A pill-shaped filter switch (All / Unpaid / Overdue …). `tone="dark"` is for use on the dark page header. */
export function Segmented<T extends string | number>({
  value, onChange, options, tone = "light", label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { key: T; label: string }[];
  tone?: "light" | "dark";
  label: string;
}) {
  const dark = tone === "dark";
  return (
    <div role="group" aria-label={label} className={cn("inline-flex rounded-xl p-1", dark ? "border border-white/10 bg-white/[0.07]" : "bg-slate-100")}>
      {options.map((o) => {
        const active = o.key === value;
        return (
          <button
            key={String(o.key)}
            type="button"
            onClick={() => onChange(o.key)}
            aria-pressed={active}
            className={cn(
              "rounded-lg px-3.5 py-1.5 text-[13px] font-semibold transition-colors",
              dark
                ? active ? "bg-white text-brand-green-950 shadow" : "text-white/70 hover:text-white"
                : active ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
