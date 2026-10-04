"use client";

import { useCallback, useEffect, useState } from "react";

interface State<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Fetches an admin JSON endpoint and exposes loading / error / data plus a
 * `reload`. Understands the API's `{ success, error }` envelope so a 4xx/5xx
 * or `success: false` becomes a readable error (never a silent blank page).
 * Pass `null` to skip fetching.
 */
export function useAdminFetch<T extends { success?: boolean; error?: string }>(url: string | null) {
  const [state, setState] = useState<State<T>>({ data: null, loading: !!url, error: null });

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!url) return;
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const res = await fetch(url, { signal });
        const json = (await res.json().catch(() => null)) as T | null;
        if (!res.ok || !json || json.success === false) throw new Error(json?.error ?? `Request failed (${res.status})`);
        setState({ data: json, loading: false, error: null });
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        setState((s) => ({ ...s, loading: false, error: e instanceof Error ? e.message : "Something went wrong" }));
      }
    },
    [url],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  return { ...state, reload: () => load() };
}
