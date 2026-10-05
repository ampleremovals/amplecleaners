/* eslint-disable @typescript-eslint/no-explicit-any -- untyped Supabase client */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/server";
import { EXPERIMENT_ID } from "@/lib/experiments";
import { twoProportionZTest, visitorsNeeded } from "@/lib/stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const PAGE = 1000;
const MAX_ROWS = 100_000;

/** Supabase returns 1000 rows per request — page through the range. */
async function fetchAll(supabase: any, since: string): Promise<any[]> {
  const rows: any[] = [];
  for (let from = 0; from < MAX_ROWS; from += PAGE) {
    const { data, error } = await supabase
      .from("site_events")
      .select("visitor_hash, event, path, variant, created_at, utm_source, utm_medium, utm_campaign, referrer_host, device")
      .gte("created_at", since)
      .order("created_at", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
  return rows;
}

const day = (iso: string) => String(iso).slice(0, 10);
/** The visitor hash rotates daily, so identity = hash + UTC day. */
const vid = (e: any) => `${day(e.created_at)}|${e.visitor_hash}`;

/** GET /api/admin/marketing?days=30 — A/B test result + where bookings come from. */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const days = Math.min(180, Math.max(1, Number(new URL(req.url).searchParams.get("days")) || 30));
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const supabase: any = createAdminClient();

  try {
    const events = await fetchAll(supabase, since);

    // ── Experiment: only people who actually SAW a hero version count as test participants ──
    const homeViewers = { a: new Set<string>(), b: new Set<string>() };
    for (const e of events) if (e.event === "page_view" && e.path === "/" && (e.variant === "a" || e.variant === "b")) homeViewers[e.variant as "a" | "b"].add(vid(e));
    const entered = new Map<string, "a" | "b">();
    for (const v of ["a", "b"] as const) for (const id of homeViewers[v]) entered.set(id, v);

    const bookingPage = { a: new Set<string>(), b: new Set<string>() };
    const submitted = { a: new Set<string>(), b: new Set<string>() };
    for (const e of events) {
      const v = entered.get(vid(e));
      if (!v) continue;
      if (e.event === "page_view" && String(e.path).startsWith("/booking/")) bookingPage[v].add(vid(e));
      if (e.event === "booking_submit") submitted[v].add(vid(e));
    }
    const build = (v: "a" | "b") => ({
      variant: v,
      visitors: homeViewers[v].size,
      bookingPageViews: bookingPage[v].size,
      bookings: submitted[v].size,
      conversion: homeViewers[v].size ? submitted[v].size / homeViewers[v].size : 0,
    });
    const a = build("a");
    const b = build("b");
    const test = twoProportionZTest(a.bookings, a.visitors, b.bookings, b.visitors);
    const baseline = a.visitors > 0 ? a.bookings / a.visitors : 0;
    const need = visitorsNeeded(baseline > 0 ? baseline : 0.03, 0.2);

    // ── Channels: visitors (events) and bookings + revenue (bookings table) ──
    const channelOf = (src: string | null, referrer: string | null) => src || (referrer ? referrer.replace(/^www\./, "") : "direct");
    const visitorsByChannel = new Map<string, Set<string>>();
    for (const e of events) {
      if (e.event !== "page_view" || e.path !== "/") continue;
      const key = channelOf(e.utm_source, e.referrer_host);
      (visitorsByChannel.get(key) ?? visitorsByChannel.set(key, new Set()).get(key)!).add(vid(e));
    }
    const { data: bookings } = await supabase
      .from("bookings")
      .select("id, source, utm_source, utm_campaign, created_at, invoices(total, status)")
      .gte("created_at", since)
      .limit(5000);
    const channels = new Map<string, { bookings: number; paid: number; campaigns: Set<string> }>();
    for (const bk of bookings ?? []) {
      const key = bk.utm_source || (bk.source === "website" ? "direct / organic" : bk.source ?? "unknown");
      const row = channels.get(key) ?? { bookings: 0, paid: 0, campaigns: new Set<string>() };
      row.bookings++;
      row.paid += (bk.invoices ?? []).filter((i: any) => i.status === "paid").reduce((s: number, i: any) => s + Number(i.total), 0);
      if (bk.utm_campaign) row.campaigns.add(bk.utm_campaign);
      channels.set(key, row);
    }

    const totalVisitors = new Set(events.filter((e) => e.event === "page_view").map(vid)).size;
    return NextResponse.json({
      success: true,
      range: { days, since },
      experimentId: EXPERIMENT_ID,
      experiment: {
        a, b,
        result: { ...test },
        visitorsNeededPerVariant: need,
        progress: need ? Math.min(1, Math.min(a.visitors, b.visitors) / need) : 0,
      },
      totals: { visitorDays: totalVisitors, bookings: bookings?.length ?? 0 },
      channels: [...channels.entries()]
        .map(([channel, c]) => ({ channel, bookings: c.bookings, paid: Math.round(c.paid * 100) / 100, campaigns: [...c.campaigns].slice(0, 5), visitors: visitorsByChannel.get(channel)?.size ?? null }))
        .sort((x, y) => y.bookings - x.bookings),
      visitorsByChannel: [...visitorsByChannel.entries()].map(([channel, s]) => ({ channel, visitors: s.size })).sort((x, y) => y.visitors - x.visitors).slice(0, 12),
      truncated: events.length >= MAX_ROWS,
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : "Couldn't build the report" }, { status: 500 });
  }
}
