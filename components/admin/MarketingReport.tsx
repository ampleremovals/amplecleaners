"use client";

import { FlaskConical, Megaphone } from "lucide-react";
import { useAdminFetch } from "@/hooks/useAdminFetch";
import { ErrorState } from "@/components/admin/DataState";
import { TABLE } from "@/components/admin/kit";
import { Panel, PanelHeader } from "@/components/admin/ui";
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
      <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
        <strong>Too early to call.</strong> Each version needs at least 100 visitors before the numbers mean anything. So far: A {a.visitors}, B {b.visitors}.
      </p>
    );
  }
  if (r.significant) {
    const winner = (r.relativeLift ?? 0) >= 0 ? b : a;
    const lift = Math.abs(r.relativeLift ?? 0);
    return (
      <p className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900">
        <strong>{HERO_LABEL[winner.variant]} is winning</strong> — {winner.variant === "b" ? "B converts" : "A converts"} about {(lift * 100).toFixed(0)}% better, and this is unlikely to be chance (p = {r.pValue.toFixed(3)}). Make it the default, then test the next idea.
      </p>
    );
  }
  return (
    <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
      <strong>No clear winner yet</strong> (p = {r.pValue.toFixed(2)} — the gap could easily be chance).{" "}
      {need ? <>To reliably spot a 20% improvement you need roughly <strong>{need.toLocaleString("en-GB")}</strong> visitors per version; you&apos;re {(progress * 100).toFixed(0)}% of the way. Keep it running.</> : "Keep it running until more bookings come in."}
    </p>
  );
}

/** A/B test result (with honest significance) and where bookings come from. */
export function MarketingReport({ days }: { days: number }) {
  const { data, loading, error, reload } = useAdminFetch<MarketingResponse>(`/api/admin/marketing?days=${days}`);

  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (loading && !data) return <div className="space-y-4" aria-busy="true"><Skeleton className="h-64 rounded-xl" /><Skeleton className="h-48 rounded-xl" /></div>;
  if (!data) return null;

  const { a, b, result, visitorsNeededPerVariant, progress } = data.experiment;
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold tracking-tight text-slate-900">Marketing</h2>

      <Panel>
        <PanelHeader
          title="Homepage headline test"
          hint="Visitors are split 50/50 automatically. A visitor counts once they see the homepage; a conversion is a booking made the same day. Nothing is stored on their device."
          right={<FlaskConical className="h-4 w-4 text-brand-violet-700" />}
        />
        <div className="overflow-x-auto">
          <table className={`${TABLE.table} min-w-[520px]`}>
            <thead className={TABLE.head}>
              <tr>
                <th className={TABLE.th}>Version</th>
                <th className={`${TABLE.th} text-right`}>Visitors</th>
                <th className={`${TABLE.th} text-right`}>Reached booking form</th>
                <th className={`${TABLE.th} text-right`}>Bookings</th>
                <th className={`${TABLE.th} text-right`}>Conversion</th>
              </tr>
            </thead>
            <tbody>
              {[a, b].map((v) => (
                <tr key={v.variant} className={TABLE.row}>
                  <td className={`${TABLE.td} font-medium text-slate-900`}>{HERO_LABEL[v.variant]}</td>
                  <td className={`${TABLE.td} text-right tabular-nums`}>{v.visitors}</td>
                  <td className={`${TABLE.td} text-right tabular-nums`}>{v.bookingPageViews} <span className="text-xs text-slate-500">({v.visitors ? pct(v.bookingPageViews / v.visitors) : "—"})</span></td>
                  <td className={`${TABLE.td} text-right tabular-nums`}>{v.bookings}</td>
                  <td className={`${TABLE.td} text-right font-semibold tabular-nums text-brand-green-800`}>{pct(v.conversion)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-5"><Verdict r={result} a={a} b={b} progress={progress} need={visitorsNeededPerVariant} /></div>
      </Panel>

      <Panel>
        <PanelHeader
          title="Where bookings come from"
          hint={<>Add <code className="rounded bg-slate-100 px-1">?utm_source=facebook&amp;utm_campaign=autumn</code> to the links in your ads so each campaign shows up here.</>}
          right={<Megaphone className="h-4 w-4 text-brand-sky-700" />}
        />
        {data.channels.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-500">No bookings in this period yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className={`${TABLE.table} min-w-[520px]`}>
              <thead className={TABLE.head}>
                <tr>
                  <th className={TABLE.th}>Channel</th>
                  <th className={`${TABLE.th} text-right`}>Bookings</th>
                  <th className={`${TABLE.th} text-right`}>Paid so far</th>
                  <th className={TABLE.th}>Campaigns</th>
                </tr>
              </thead>
              <tbody>
                {data.channels.map((c) => (
                  <tr key={c.channel} className={TABLE.row}>
                    <td className={`${TABLE.td} font-medium capitalize text-slate-900`}>{c.channel}</td>
                    <td className={`${TABLE.td} text-right tabular-nums`}>{c.bookings}</td>
                    <td className={`${TABLE.td} text-right font-semibold tabular-nums`}>{formatCurrency(c.paid)}</td>
                    <td className={`${TABLE.td} text-slate-600`}>{c.campaigns.join(", ") || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {(data.visitorsByChannel.length > 0 || data.truncated) && (
          <div className="space-y-1 border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
            {data.visitorsByChannel.length > 0 && <p>Homepage visitors by source: {data.visitorsByChannel.map((v) => `${v.channel} ${v.visitors}`).join(" · ")}</p>}
            {data.truncated && <p className="text-amber-700">Showing the most recent 100,000 events for this range.</p>}
          </div>
        )}
      </Panel>
    </div>
  );
}
