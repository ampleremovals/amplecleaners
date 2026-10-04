import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

/** Best-effort client IP behind Vercel's proxy. */
export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  return (forwarded?.split(",")[0] ?? req.headers.get("x-real-ip") ?? "unknown").trim();
}

/**
 * DB-backed fixed-window rate limit (atomic `check_rate_limit` RPC — works
 * across serverless instances, unlike an in-memory Map).
 *
 * Returns a ready-made 429 response when the caller is over the limit, else
 * null. Deliberately FAILS OPEN if the limiter itself errors: a database blip
 * must never stop a real customer from booking. The failure is logged.
 *
 *   const limited = await rateLimit(req, "booking", 5, 600);
 *   if (limited) return limited;
 */
export async function rateLimit(
  req: Request,
  name: string,
  limit: number,
  windowSeconds: number,
  extraKey?: string,
): Promise<NextResponse | null> {
  const key = [name, clientIp(req), extraKey?.toLowerCase()].filter(Boolean).join(":");
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("check_rate_limit", {
      p_key: key,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });
    if (error) throw error;
    if (data === false) {
      return NextResponse.json(
        { success: false, error: "Too many requests — please wait a few minutes and try again." },
        { status: 429, headers: { "Retry-After": String(windowSeconds) } },
      );
    }
  } catch (e) {
    console.warn("rate limiter unavailable, failing open:", e instanceof Error ? e.message : e);
  }
  return null;
}
