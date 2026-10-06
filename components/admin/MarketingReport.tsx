"use client";

import { FlaskConical, Megaphone } from "lucide-react";
import { useAdminFetch } from "@/hooks/useAdminFetch";
import { ErrorState } from "@/components/admin/DataState";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";

interface Variant { variant: "a" | "b"; visitors: number; bookingPageViews: number; bookings: number; conversion: number }
interface MarketingResponse {
  success: boolean; error?: string; experimentId: string; truncated: boolean;
  experiment: {
    a: Variant; b: Variant;
    result: { relativeLift: number | null; pValue: number; significant: boolean };
    visitorsNeededPerVariant: number | null; progress: number;
  };
  totals: { visitorDays: number; bookings: number };
  channels: { channel: string; bookings: number; paid: number; campaigns: string[]; visitors: number | null }[];
  visitorsByChannel: { channel: string; visitors: number }[];
}

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
const HERO_LABEL = { a: "A — control: price-led", b: "B — outcome-led" } as const;

function Verdict({ r, a, b, progress, need }: { r: MarketingResponse["experiment"]["result"]; a: Variant; b: Variant; progress: number; need: number | null }) {
  const enough = a.visitors >= 100 && b.visitors >= 100;
  if (!enough) {
    return (
      <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
        <strong>Too early to call.</strong> Each version needs at least 100 visitors before the numbers mean anything. So far: A {a.visitors}, B {b.visitors}.
      </p>
    );
  }
  if (r.significant) {
    const winner = (r.relativeLift ?? 0) >= 0 ? b : a;
    const lift = Math.abs(r.relativeLift ?? 0);
    return (
      <p className="rounded-xl bg-brand-green-50 p-3 text-sm text-brand-green-900">
        <strong>{HERO_LABEL[winner.variant]} is winning</strong> — {winner.variant === "b" ? "B converts" : "A converts"} about {(lift * 100).toFixed(0)}% better, and this is unlikely to be chance (p = {r.pValue.toFixed(3)}). Make it the default, then test the next idea.
      </p>
    );
  }
  return (
    <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
      <strong>No clear winner yet</strong> (p = {r.pValue.toFixed(2)} — the gap could easily be chance).{" "}
      {need ? <>To reliably spot a 20% improvement you need roughly <strong>{need.toLocaleString("en-GB")}</strong> visitors per version; you&apos;re {(progress * 100).toFixed(0)}% of the way. Keep it running.</> : "Keep it running until more bookings come in."}
    </p>
  );
}

/** A/B test result (with honest significance) and where bookings come from. */
export function MarketingReport({ days }: { days: number }) {
  const { data, loading, error, reload } = useAdminFetch<MarketingResponse>(`/api/admin/marketing?days=${days}`);

  if (error) return <div className="mt-8"><ErrorState message={error} onRetry={reload} /></div>;
  if (loading && !data) return <div className="mt-8 space-y-4" aria-busy="true"><Skeleton className="h-64 rounded-xl" /><Skeleton className="h-48 rounded-xl" /></div>;
  if (!data) return null;

  const { a, b, result, visitorsNeededPerVariant, progress } = data.experiment;
  return (
    <div className="mt-10 space-y-4">
      <h2 className="font-display text-xl font-semibold text-slate-900">Marketing</h2>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="flex items-center gap-2 font-bold text-slate-900"><FlaskConical className="h-4 w-4 text-brand-violet-700" /> Homepage headline test</h3>
        <p className="text-xs text-slate-500">Visitors are split 50/50 automatically. A visitor counts once they see the homepage; a conversion is a booking made the same day. Nothing is stored on their device.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead className="border-b border-slate-200 text-left text-xs font-medium text-slate-500">
              <tr><th className="py-2 pr-3">Version</th><th className="py-2 pr-3 text-right">Visitors</th><th className="py-2 pr-3 text-right">Reached booking form</th><th className="py-2 pr-3 text-right">Bookings</th><th className="py-2 text-right">Conversion</th></tr>
            </thead>
            <tbody>
              {[a, b].map((v) => (
                <tr key={v.variant} className="border-b border-slate-100 last:border-0">
                  <td className="py-2.5 pr-3 font-semibold text-slate-800">{HERO_LABEL[v.variant]}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">{v.visitors}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">{v.bookingPageViews} <span className="text-xs text-slate-400">({v.visitors ? pct(v.bookingPageViews / v.visitors) : "—"})</span></td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">{v.bookings}</td>
                  <td className="py-2.5 text-right font-bold tabular-nums text-brand-green-800">{pct(v.conversion)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4"><Verdict r={result} a={a} b={b} progress={progress} need={visitorsNeededPerVariant} /></div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="flex items-center gap-2 font-bold text-slate-900"><Megaphone className="h-4 w-4 text-brand-sky-700" /> Where bookings come from</h3>
        <p className="text-xs text-slate-500">Add <code className="rounded bg-slate-100 px-1">?utm_source=facebook&amp;utm_campaign=autumn</code> to the links in your ads so each campaign shows up here.</p>
        {data.channels.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">No bookings in this period yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead className="border-b border-slate-200 text-left text-xs font-medium text-slate-500">
                <tr><th className="py-2 pr-3">Channel</th><th className="py-2 pr-3 text-right">Bookings</th><th className="py-2 pr-3 text-right">Paid so far</th><th className="py-2">Campaigns</th></tr>
              </thead>
              <tbody>
                {data.channels.map((c) => (
                  <tr key={c.channel} className="border-b border-slate-100 last:border-0">
                    <td className="py-2.5 pr-3 font-semibold capitalize text-slate-800">{c.channel}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{c.bookings}</td>
                    <td className="py-2.5 pr-3 text-right font-semibold tabular-nums">{formatCurrency(c.paid)}</td>
                    <td className="py-2.5 text-slate-500">{c.campaigns.join(", ") || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data.visitorsByChannel.length > 0 && (
          <p className="mt-4 text-xs text-slate-500">Homepage visitors by source: {data.visitorsByChannel.map((v) => `${v.channel} ${v.visitors}`).join(" · ")}</p>
        )}
        {data.truncated && <p className="mt-2 text-xs text-amber-700">Showing the most recent 100,000 events for this range.</p>}
      </section>
    </div>
  );
}
