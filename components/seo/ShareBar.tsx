"use client";

import { useEffect, useState } from "react";
import { Check, Link2, Mail, Printer, Share2 } from "lucide-react";

const btn = "inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-800 hover:border-brand-green-400 hover:text-brand-green-800";

/** Share a guide: WhatsApp, email, Facebook, X, copy link, the phone's own share sheet, and print. */
export function ShareBar({ title, path, printable }: { title: string; path: string; printable?: boolean }) {
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const url = `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.amplecleaners.com"}${path}`;
  const text = encodeURIComponent(`${title} ${url}`);

  useEffect(() => setCanNativeShare(typeof navigator !== "undefined" && "share" in navigator), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked: the other share buttons still work */
    }
  };

  return (
    <div className="print:hidden" aria-label="Share this guide">
      <p className="mb-2 text-sm font-bold text-slate-800">Share this guide</p>
      <div className="flex flex-wrap gap-2">
        {canNativeShare && (
          <button type="button" className={btn} onClick={() => navigator.share({ title, url }).catch(() => undefined)}><Share2 className="h-4 w-4" />Share</button>
        )}
        <a className={btn} href={`https://wa.me/?text=${text}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
        <a className={btn} href={`mailto:?subject=${encodeURIComponent(title)}&body=${text}`}><Mail className="h-4 w-4" />Email</a>
        <a className={btn} href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer">Facebook</a>
        <a className={btn} href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer">X</a>
        <button type="button" className={btn} onClick={copy}>{copied ? <Check className="h-4 w-4 text-brand-green-700" /> : <Link2 className="h-4 w-4" />}{copied ? "Copied" : "Copy link"}</button>
        {printable && <button type="button" className={btn} onClick={() => window.print()}><Printer className="h-4 w-4" />Print checklist</button>}
      </div>
    </div>
  );
}
