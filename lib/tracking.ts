/* eslint-disable @typescript-eslint/no-explicit-any -- untyped Supabase client */
import { createHash } from "crypto";
import { createAdminClient } from "@/lib/supabase/server";
import { clientIp } from "@/lib/rate-limit";
import { isBot, variantFor } from "@/lib/experiments";
import { AREAS } from "@/lib/seo/areas";
import { GUIDES } from "@/lib/seo/guides";
import { SEO_SERVICES } from "@/lib/seo/services";

/**
 * Only these public paths are ever recorded. Tokenised links (/quote, /pay,
 * /manage, /rate) are deliberately excluded so a secret can never end up in analytics.
 */
const ALLOWED_PATH = /^\/(booking\/[a-z_]+|terms|privacy|confirmation|cleaners\/register)?$/;

/** The local SEO pages, matched against the real service/area lists (never a loose pattern that could admit a tokenised link). */
const SEO_SERVICE_SLUGS = new Set<string>(SEO_SERVICES.map((s) => s.slug));
const SEO_AREA_SLUGS = new Set<string>(AREAS.map((a) => a.slug));

const GUIDE_PATHS = new Set<string>(["/guides", ...GUIDES.map((g) => `/guides/${g.slug}`)]);

export const isTrackablePath = (path: string) => {
  if (ALLOWED_PATH.test(path) || GUIDE_PATHS.has(path)) return true;
  const [, service, area, extra] = path.split("/");
  return SEO_SERVICE_SLUGS.has(service ?? "") && extra === undefined && (area === undefined || SEO_AREA_SLUGS.has(area));
};

/**
 * A pseudonymous visitor id that ROTATES EVERY DAY (the salt includes the UTC
 * date), so it can count "unique visitors today" and join a visit to a booking
 * made the same day, but can't follow anyone across days. The IP itself is
 * never stored.
 */
export function dailyVisitorHash(ip: string, userAgent: string, now: Date = new Date()): string {
  const day = now.toISOString().slice(0, 10);
  const salt = createHash("sha256").update(`${process.env.QUOTE_CONFIRM_SECRET ?? "dev"}|${day}`).digest("hex");
  return createHash("sha256").update(`${salt}|${ip}|${userAgent}`).digest("hex").slice(0, 32);
}

export function deviceOf(userAgent: string): "mobile" | "desktop" {
  return /mobi|android|iphone|ipad/i.test(userAgent) ? "mobile" : "desktop";
}

export interface EventInput {
  event: "page_view" | "booking_submit";
  path: string;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  referrer_host?: string | null;
}

/** Records one event for this request's visitor. Never throws, ignores bots, drops anything that isn't a real browser visit. */
export async function recordEvent(req: Request, e: EventInput): Promise<void> {
  try {
    // Test mode (DISABLE_OUTBOUND_MESSAGES=1): never write analytics unless a test explicitly opts in,
    // so automated runs can't pollute real numbers.
    if (process.env.DISABLE_OUTBOUND_MESSAGES === "1" && req.headers.get("x-e2e-track") !== "1") return;
    const ua = req.headers.get("user-agent") ?? "";
    if (isBot(ua)) return;
    const ip = clientIp(req);
    if (ip === "unknown") return;
    const clip = (v?: string | null) => (v ? String(v).slice(0, 100) : null);
    const supabase: any = createAdminClient();
    await supabase.from("site_events").insert({
      visitor_hash: dailyVisitorHash(ip, ua),
      event: e.event,
      path: e.path.slice(0, 120),
      variant: variantFor(ip, ua),
      utm_source: clip(e.utm_source),
      utm_medium: clip(e.utm_medium),
      utm_campaign: clip(e.utm_campaign),
      referrer_host: clip(e.referrer_host),
      device: deviceOf(ua),
    });
  } catch {
    /* analytics must never affect a visitor */
  }
}
