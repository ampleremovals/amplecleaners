"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

/**
 * A label/value row (for bank details, references, amounts) with a tiny
 * tap-to-copy button. Renders as div>dt+dd so it's valid inside a <dl>.
 */
export function CopyRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked (e.g. insecure context) — ignore */
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="flex items-center gap-2">
        <span className={`font-display font-bold tracking-wide ${strong ? "text-lg text-brand-green-900" : "text-base text-brand-green-950"}`}>
          {value}
        </span>
        <button
          type="button"
          onClick={copy}
          aria-label={copied ? `${label} copied` : `Copy ${label}`}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition-colors hover:border-brand-green-300 hover:text-brand-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green-500"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-brand-sky-600" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </dd>
    </div>
  );
}
