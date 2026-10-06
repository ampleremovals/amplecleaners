import { Check } from "lucide-react";

const STEPS = ["Your details", "Secure your date", "All set"];

/** Where the customer is in the booking journey. `current` is 1-based; earlier steps show as done. */
export function Steps({ current }: { current: 1 | 2 | 3 }) {
  return (
    <ol className="flex items-center gap-2 text-[13px] font-semibold sm:gap-3" aria-label="Booking progress">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <li key={label} className="flex items-center gap-2 sm:gap-3" aria-current={active ? "step" : undefined}>
            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${done ? "bg-brand-green-700 text-white" : active ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-600"}`}>
              {done ? <Check className="h-3.5 w-3.5" aria-hidden /> : n}
            </span>
            <span className={`${active ? "text-slate-900" : done ? "text-slate-700" : "text-slate-500"} ${active ? "" : "hidden sm:inline"}`}>{label}</span>
            {n < STEPS.length && <span className={`h-px w-4 sm:w-8 ${done ? "bg-brand-green-600" : "bg-slate-300"}`} aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}
