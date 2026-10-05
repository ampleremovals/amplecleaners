"use client";

import { useEffect, useState } from "react";

/** Marketing parameters worth keeping — carried through the URL, never stored on the device. */
const KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid"] as const;
export type Attribution = Partial<Record<(typeof KEYS)[number], string>>;

/** Reads the marketing parameters from the current URL (empty on the server). */
export function readAttribution(): Attribution {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  const out: Attribution = {};
  for (const k of KEYS) {
    const v = params.get(k);
    if (v) out[k] = v.slice(0, 200);
  }
  return out;
}

/** "?utm_source=…&gclid=…" for the current URL (or "" if there are none). Updates after hydration. */
export function useAttributionQuery(): string {
  const [query, setQuery] = useState("");
  useEffect(() => {
    const attr = readAttribution();
    const s = new URLSearchParams(attr as Record<string, string>).toString();
    setQuery(s ? `?${s}` : "");
  }, []);
  return query;
}
