"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useAdminFetch } from "@/hooks/useAdminFetch";
import { EmptyState, ErrorState } from "@/components/admin/DataState";
import { Panel, PanelHeader, Pill } from "@/components/admin/ui";
import { BTN, INPUT, TABLE, TableCard } from "@/components/admin/kit";
import { formatWhen } from "@/components/admin/email/parts";
import { Skeleton } from "@/components/ui/skeleton";

interface Row { email: string; scope: "marketing" | "all"; reason: string; created_at: string }

/** Everyone we will not email: unsubscribes (which you can reverse on request) and bounces (which you can't). */
export function AudienceTab({ onChanged }: { onChanged: () => void }) {
  const { data, loading, error, reload } = useAdminFetch<{ success: boolean; rows: Row[] }>("/api/admin/email/suppressions");
  const [email, setEmail] = useState("");

  async function add() {
    try {
      const res = await fetch("/api/admin/email/suppressions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? "Couldn't add");
      toast.success("They won't get marketing emails any more");
      setEmail(""); reload(); onChanged();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't add"); }
  }
  async function lift(row: Row) {
    if (!confirm(`Let ${row.email} receive marketing emails again? Only do this if they asked you to.`)) return;
    try {
      const res = await fetch(`/api/admin/email/suppressions?email=${encodeURIComponent(row.email)}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? "Couldn't remove");
      toast.success("Removed"); reload(); onChanged();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't remove"); }
  }

  if (error) return <ErrorState message={error} onRetry={reload} />;
  return (
    <div className="space-y-4">
      <Panel>
        <PanelHeader title="Stop emailing someone" hint="For when a customer asks you by phone or WhatsApp. Their booking emails (quotes, reminders, invoices) still reach them." />
        <form className="flex flex-col gap-3 p-5 sm:flex-row" onSubmit={(e) => { e.preventDefault(); if (email.trim()) add(); }}>
          <input type="email" required className={`${INPUT} sm:max-w-sm`} placeholder="customer@example.com" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email address to stop marketing to" />
          <button type="submit" className={BTN.primary}>Stop marketing emails</button>
        </form>
      </Panel>
      <Panel>
        <PanelHeader title="Do-not-email list" hint="Unsubscribed people are skipped for marketing. Bounced or spam-reported addresses are skipped for everything, to protect your sender reputation." />
        {loading && !data ? <Skeleton className="m-5 h-32" /> : !data?.rows.length ? <EmptyState title="Nobody on the list" hint="People who unsubscribe or bounce appear here automatically." /> : (
          <TableCard minWidth={600}>
            <table className={TABLE.table}>
              <thead className={TABLE.head}><tr>{["Email", "Blocked from", "Why", "When", ""].map((h, i) => <th key={i} className={TABLE.th}>{h}</th>)}</tr></thead>
              <tbody>{data.rows.map((r) => (
                <tr key={r.email} className={TABLE.row}>
                  <td className={`${TABLE.td} font-medium text-slate-900`}>{r.email}</td>
                  <td className={TABLE.td}><Pill tone={r.scope === "all" ? "critical" : "warning"}>{r.scope === "all" ? "All email" : "Marketing"}</Pill></td>
                  <td className={`${TABLE.td} text-slate-600`}>{r.reason}</td>
                  <td className={`${TABLE.td} text-slate-600`}>{formatWhen(r.created_at)}</td>
                  <td className={`${TABLE.td} text-right`}>{r.scope === "marketing" && <button type="button" className={BTN.secondary} onClick={() => lift(r)}>Allow again</button>}</td>
                </tr>
              ))}</tbody>
            </table>
          </TableCard>
        )}
      </Panel>
    </div>
  );
}
