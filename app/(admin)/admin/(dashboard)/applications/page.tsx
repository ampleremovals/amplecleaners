"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, ShieldCheck, ShieldAlert, UserPlus, X } from "lucide-react";
import { useAdminFetch } from "@/hooks/useAdminFetch";
import { TableSkeleton, ErrorState, EmptyState } from "@/components/admin/DataState";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { formatDate } from "@/lib/utils";

interface Application {
  id: string; full_name: string; email: string; phone: string; postcode: string; areas: string | null;
  experience_years: number | null; has_right_to_work: boolean; has_dbs: boolean;
  availability_notes: string | null; about: string | null; status: "new" | "approved" | "rejected"; created_at: string;
}
interface Response { success: boolean; error?: string; applications: Application[] }

const TABS = [{ key: "new", label: "New" }, { key: "approved", label: "Approved" }, { key: "rejected", label: "Rejected" }] as const;

function Check_({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${ok ? "bg-brand-green-100 text-brand-green-800" : "bg-amber-100 text-amber-800"}`}>
      {ok ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldAlert className="h-3.5 w-3.5" />} {label}: {ok ? "yes" : "no"}
    </span>
  );
}

export default function ApplicationsPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("new");
  const { data, loading, error, reload } = useAdminFetch<Response>(`/api/admin/applications?status=${tab}`);
  const [confirm, setConfirm] = useState<{ app: Application; action: "approve" | "reject" } | null>(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    if (!confirm) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/applications/${confirm.app.id}/${confirm.action}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? "Failed");
      toast.success(confirm.action === "approve" ? `${confirm.app.full_name} approved — welcome email sent` : `${confirm.app.full_name} declined`);
      setConfirm(null);
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  const apps = data?.applications ?? [];

  return (
    <div className="p-4 sm:p-8">
      <h1 className="font-display text-2xl font-extrabold text-slate-900">Applications</h1>
      <p className="mt-1 text-sm text-slate-500">People who applied to clean for you at /cleaners/register.</p>

      <div className="mt-5 flex w-fit rounded-xl bg-slate-100 p-1">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-colors ${tab === t.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>{t.label}</button>
        ))}
      </div>

      <div className="mt-5 space-y-3">
        {loading && !data ? <TableSkeleton rows={3} cols={3} />
          : error ? <ErrorState message={error} onRetry={reload} />
          : apps.length === 0 ? <EmptyState icon={<UserPlus className="h-8 w-8" />} title={tab === "new" ? "No new applications" : `No ${tab} applications`} hint={tab === "new" ? "Share your /cleaners/register link to recruit." : undefined} />
          : apps.map((a) => (
            <article key={a.id} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-bold text-slate-900">{a.full_name}</h2>
                  <p className="text-sm text-slate-500">{a.email} · {a.phone}</p>
                  <p className="text-xs text-slate-400">Applied {formatDate(a.created_at)} · lives {a.postcode}{a.experience_years != null ? ` · ${a.experience_years} yrs experience` : ""}</p>
                </div>
                {a.status === "new" && (
                  <div className="flex gap-2">
                    <button onClick={() => setConfirm({ app: a, action: "reject" })} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"><X className="h-4 w-4" /> Decline</button>
                    <button onClick={() => setConfirm({ app: a, action: "approve" })} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-green-700 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-green-800"><Check className="h-4 w-4" /> Approve</button>
                  </div>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2"><Check_ ok={a.has_right_to_work} label="Right to work" /><Check_ ok={a.has_dbs} label="DBS" /></div>
              {a.areas && <p className="mt-3 text-sm text-slate-600"><span className="font-semibold">Areas:</span> {a.areas}</p>}
              {a.availability_notes && <p className="mt-1 text-sm text-slate-600"><span className="font-semibold">Availability:</span> {a.availability_notes}</p>}
              {a.about && <p className="mt-1 text-sm text-slate-600"><span className="font-semibold">About:</span> {a.about}</p>}
            </article>
          ))}
      </div>

      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(o) => { if (!o) setConfirm(null); }}
        title={confirm?.action === "approve" ? `Approve ${confirm.app.full_name}?` : `Decline ${confirm?.app.full_name ?? ""}?`}
        description={confirm?.action === "approve"
          ? "This creates their login and emails them a link to set a password. Their DBS stays unverified until you upload and verify the certificate — they won't be auto-assigned jobs before then."
          : "They'll get a short, polite email. This can't be undone."}
        confirmLabel={confirm?.action === "approve" ? "Approve & send welcome" : "Decline"}
        busy={busy}
        onConfirm={run}
      />
    </div>
  );
}
