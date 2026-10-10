"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Panel, PanelHeader, Pill } from "@/components/admin/ui";
import { BTN, INPUT } from "@/components/admin/kit";
import { Switch, humanHours, pct, type TemplateStat } from "@/components/admin/email/parts";

export interface JourneyStep { template: string; hours: number; defaultHours: number; name: string; category: "service" | "marketing"; stats: TemplateStat | null }
export interface Journey { key: string; name: string; description: string; timing: string; enabled: boolean; steps: JourneyStep[] }
export interface Health { trackingConfigured: boolean; schedulerConfigured: boolean; lastAutomatedSend: string | null; sendingNow: boolean; sendHours: string; marketingGapDays: number }

function JourneyCard({ j, onChanged, onEdit }: { j: Journey; onChanged: () => void; onEdit: (templateKey: string) => void }) {
  const [hours, setHours] = useState<number[]>(j.steps.map((s) => s.hours));
  const [busy, setBusy] = useState(false);
  const dirty = hours.some((h, i) => h !== j.steps[i].hours);

  async function patch(body: Record<string, unknown>, ok: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/email/automations/${j.key}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? "Couldn't save");
      toast.success(ok);
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel className={j.enabled ? "" : "opacity-75"}>
      <div className="flex items-start justify-between gap-4 p-5">
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold text-slate-900">{j.name}</h3>
          <p className="mt-1 text-sm text-slate-500">{j.description}</p>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-medium text-slate-500">{j.enabled ? "On" : "Off"}</span>
          <Switch checked={j.enabled} disabled={busy} label={`${j.name} journey`} onChange={(v) => patch({ enabled: v }, v ? `${j.name} is on` : `${j.name} is off`)} />
        </div>
      </div>
      <ol className="divide-y divide-slate-100 border-t border-slate-100">
        {j.steps.map((s, i) => (
          <li key={s.template} className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => onEdit(s.template)} className="text-left text-sm font-medium text-slate-900 underline-offset-2 hover:text-brand-green-800 hover:underline">{s.name}</button>
                <Pill tone={s.category === "marketing" ? "info" : "neutral"}>{s.category === "marketing" ? "Marketing" : "About their booking"}</Pill>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {s.stats && s.stats.sent > 0
                  ? `Last 30 days: ${s.stats.sent} sent · ${pct(s.stats.opened, s.stats.sent)} opened · ${pct(s.stats.clicked, s.stats.sent)} clicked`
                  : "Not sent yet in the last 30 days"}
              </p>
            </div>
            <label className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 sm:justify-end">
              <span className="whitespace-nowrap">Sends after</span>
              <input type="number" min={0} max={8760} value={hours[i]} onChange={(e) => setHours((h) => h.map((x, k) => (k === i ? Math.max(0, Math.round(Number(e.target.value) || 0)) : x)))} className={`${INPUT} w-20 text-center`} aria-label={`Hours for ${s.name}`} />
              <span>hours <span className="text-slate-400">({humanHours(hours[i])})</span></span>
            </label>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-5 py-3">
        <p className="text-xs text-slate-500">Timing counts from: {j.timing}.</p>
        {dirty && (
          <div className="flex gap-2">
            <button type="button" className={BTN.secondary} onClick={() => setHours(j.steps.map((s) => s.hours))}>Undo</button>
            <button type="button" disabled={busy} className={BTN.primary} onClick={() => patch({ hours }, "Timing saved")}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save timing"}</button>
          </div>
        )}
      </div>
    </Panel>
  );
}

export function JourneysTab({ journeys, health, onChanged, onEdit }: { journeys: Journey[]; health: Health; onChanged: () => void; onEdit: (templateKey: string) => void }) {
  return (
    <div className="space-y-4">
      {(!health.trackingConfigured || !health.schedulerConfigured) && (
        <div role="status" className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <div>
            {!health.schedulerConfigured && <p><strong>The email timer isn&apos;t set up</strong>, so journey emails won&apos;t go out on time.</p>}
            {!health.trackingConfigured && <p>Delivery tracking is off, so opens, clicks and bounces aren&apos;t recorded. Bounced addresses would not be blocked automatically.</p>}
          </div>
        </div>
      )}
      <Panel>
        <PanelHeader title="How sending works" />
        <ul className="grid gap-x-8 gap-y-2 px-5 py-4 text-sm text-slate-600 sm:grid-cols-2">
          <li>Emails only go out between <strong>{health.sendHours}</strong>. Anything due overnight waits for the morning.</li>
          <li>A customer gets at most <strong>one marketing email every {health.marketingGapDays} days</strong>.</li>
          <li>Every journey stops by itself when the customer pays, books again or unsubscribes.</li>
          <li>Marketing emails carry an unsubscribe link. Bounced addresses are blocked automatically.</li>
        </ul>
      </Panel>
      <div className="gap-4 xl:columns-2 [&>*]:mb-4 [&>*]:break-inside-avoid">
        {journeys.map((j) => <JourneyCard key={j.key} j={j} onChanged={onChanged} onEdit={onEdit} />)}
      </div>
    </div>
  );
}
