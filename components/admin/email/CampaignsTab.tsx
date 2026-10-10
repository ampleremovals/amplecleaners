"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";
import { useAdminFetch } from "@/hooks/useAdminFetch";
import { ErrorState } from "@/components/admin/DataState";
import { Panel, PanelHeader } from "@/components/admin/ui";
import { BTN, Field, INPUT, TABLE, TableCard } from "@/components/admin/kit";
import { formatWhen, pct } from "@/components/admin/email/parts";
import { Skeleton } from "@/components/ui/skeleton";

interface Campaign { id: string; name: string; template_key: string; segment: string; recipient_count: number; created_at: string; sent: number; opened: number; clicked: number; skipped: number }
interface Resp { success: boolean; campaigns: Campaign[]; segments: { key: string; label: string; hint: string }[]; templates: { key: string; name: string }[] }

export function CampaignsTab() {
  const { data, loading, error, reload } = useAdminFetch<Resp>("/api/admin/email/campaigns");
  const [name, setName] = useState("");
  const [templateKey, setTemplateKey] = useState("");
  const [segment, setSegment] = useState("customers_all");
  const [count, setCount] = useState<number | null>(null);
  const [counting, setCounting] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => { if (data && !templateKey && data.templates[0]) setTemplateKey(data.templates[0].key); }, [data, templateKey]);

  // How many people would get it? Re-counted whenever the audience or template changes.
  useEffect(() => {
    if (!templateKey) return;
    let cancelled = false;
    setCounting(true);
    fetch("/api/admin/email/campaigns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "count", templateKey, segment, dryRun: true }) })
      .then((r) => r.json()).then((j) => { if (!cancelled) setCount(j.success ? j.count : null); }).catch(() => !cancelled && setCount(null)).finally(() => !cancelled && setCounting(false));
    return () => { cancelled = true; };
  }, [templateKey, segment]);

  async function send() {
    const audience = data?.segments.find((s) => s.key === segment)?.label ?? segment;
    if (!confirm(`Send "${name}" to ${count} people (${audience})?\n\nIt goes out over the next few hours, only between 8am and 8pm.`)) return;
    setSending(true);
    try {
      const res = await fetch("/api/admin/email/campaigns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, templateKey, segment }) });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? "Couldn't queue the campaign");
      toast.success(`Queued for ${json.queued} people`);
      setName("");
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't queue the campaign");
    } finally {
      setSending(false);
    }
  }

  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (loading && !data) return <Skeleton className="h-80 w-full rounded-xl" />;
  const segmentInfo = data?.segments.find((s) => s.key === segment);

  return (
    <div className="space-y-4">
      <Panel>
        <PanelHeader title="Send a one-off email" hint="Seasonal offers, news, or a nudge to past customers. People who unsubscribed are never included." />
        <div className="grid gap-4 p-5 md:grid-cols-3">
          <Field label="Campaign name (only you see this)"><input className={INPUT} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Spring clean 2026" /></Field>
          <Field label="Who gets it">
            <select className={INPUT} value={segment} onChange={(e) => setSegment(e.target.value)}>{data?.segments.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}</select>
          </Field>
          <Field label="Which email">
            <select className={INPUT} value={templateKey} onChange={(e) => setTemplateKey(e.target.value)}>{data?.templates.map((t) => <option key={t.key} value={t.key}>{t.name}</option>)}</select>
          </Field>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-5 py-3">
          <p className="text-sm text-slate-600">
            {counting ? "Counting…" : count == null ? "" : <><strong className="text-slate-900">{count}</strong> {count === 1 ? "person" : "people"} will receive this. <span className="text-slate-500">{segmentInfo?.hint}.</span></>}
          </p>
          <button type="button" className={BTN.primary} disabled={sending || name.trim().length < 2 || !count} onClick={send}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send campaign
          </button>
        </div>
        <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">Edit the wording first in the Templates tab, and use &quot;Send me a test&quot; to see it in your own inbox. Anyone who already had a marketing email in the last 3 days is skipped automatically.</p>
      </Panel>

      <Panel>
        <PanelHeader title="Past campaigns" />
        {data?.campaigns.length ? (
          <TableCard minWidth={720}>
            <table className={TABLE.table}>
              <thead className={TABLE.head}><tr>{["Campaign", "Audience", "Queued", "Sent", "Opened", "Clicked", "Skipped", "Date"].map((h) => <th key={h} className={TABLE.th}>{h}</th>)}</tr></thead>
              <tbody>
                {data.campaigns.map((c) => (
                  <tr key={c.id} className={TABLE.row}>
                    <td className={`${TABLE.td} font-medium text-slate-900`}>{c.name}</td>
                    <td className={`${TABLE.td} text-slate-600`}>{data.segments.find((s) => s.key === c.segment)?.label ?? c.segment}</td>
                    <td className={TABLE.td}>{c.recipient_count}</td>
                    <td className={TABLE.td}>{c.sent}</td>
                    <td className={TABLE.td}>{pct(c.opened, c.sent)}</td>
                    <td className={TABLE.td}>{pct(c.clicked, c.sent)}</td>
                    <td className={TABLE.td}>{c.skipped}</td>
                    <td className={`${TABLE.td} text-slate-600`}>{formatWhen(c.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableCard>
        ) : <p className="px-5 py-8 text-center text-sm text-slate-500">No campaigns sent yet.</p>}
      </Panel>
    </div>
  );
}
