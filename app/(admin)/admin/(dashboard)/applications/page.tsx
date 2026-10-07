"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, ShieldCheck, ShieldAlert, UserPlus, X } from "lucide-react";
import { useAdminFetch } from "@/hooks/useAdminFetch";
import { TableSkeleton, ErrorState, EmptyState } from "@/components/admin/DataState";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Segmented } from "@/components/admin/controls";
import { AdminHero, AdminPage, BTN } from "@/components/admin/kit";
import { Avatar, Panel, Pill } from "@/components/admin/ui";
import { formatDate } from "@/lib/utils";

interface Application {
  id: string; full_name: string; email: string; phone: string; postcode: string; areas: string | null;
  experience_years: number | null; has_right_to_work: boolean; has_dbs: boolean;
  availability_notes: string | null; about: string | null; status: "new" | "approved" | "rejected"; created_at: string;
}
interface Response { success: boolean; error?: string; applications: Application[] }

const TABS = [{ key: "new", label: "New" }, { key: "approved", label: "Approved" }, { key: "rejected", label: "Rejected" }] as const;
type Tab = (typeof TABS)[number]["key"];

function Check_({ ok, label }: { ok: boolean; label: string }) {
  return (
    <Pill tone={ok ? "positive" : "warning"}>
      {ok ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldAlert className="h-3.5 w-3.5" />} {label}: {ok ? "yes" : "no"}
    </Pill>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return <p className="text-sm text-slate-600"><span className="font-medium text-slate-900">{label}:</span> {children}</p>;
}

export default function ApplicationsPage() {
  const [tab, setTab] = useState<Tab>("new");
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
    <AdminPage>
      <AdminHero
        eyebrow="Operations"
        title="Applications"
        description={<>People who applied to clean for you at <span className="font-medium text-white">/cleaners/register</span>. Approving someone creates their login and emails them a link to set a password.</>}
        stats={data ? [
          { label: tab === "new" ? "Waiting for review" : tab === "approved" ? "Approved" : "Declined", value: apps.length, hint: tab === "new" && apps.length > 0 ? "Review them below" : undefined, tone: tab === "new" && apps.length > 0 ? "warning" : "default" },
        ] : undefined}
      />

      <Segmented label="Application status" value={tab} onChange={setTab} options={TABS.map((t) => ({ key: t.key, label: t.label }))} />

      <div className="space-y-4">
        {loading && !data ? <TableSkeleton rows={3} cols={3} />
          : error ? <ErrorState message={error} onRetry={reload} />
          : apps.length === 0 ? <EmptyState icon={<UserPlus className="h-8 w-8" />} title={tab === "new" ? "No new applications" : `No ${tab} applications`} hint={tab === "new" ? "Share your /cleaners/register link to recruit." : undefined} />
          : apps.map((a) => (
            <Panel key={a.id}>
              <article className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <Avatar name={a.full_name} size={44} />
                    <div>
                      <h2 className="text-base font-semibold text-slate-900">{a.full_name}</h2>
                      <p className="text-sm text-slate-600">{a.email} · {a.phone}</p>
                      <p className="mt-0.5 text-xs text-slate-500">Applied {formatDate(a.created_at)} · lives {a.postcode}{a.experience_years != null ? ` · ${a.experience_years} yrs experience` : ""}</p>
                    </div>
                  </div>
                  {a.status === "new" && (
                    <div className="flex gap-2">
                      <button onClick={() => setConfirm({ app: a, action: "reject" })} className={BTN.secondary}><X className="h-4 w-4" /> Decline</button>
                      <button onClick={() => setConfirm({ app: a, action: "approve" })} className={BTN.primary}><Check className="h-4 w-4" /> Approve</button>
                    </div>
                  )}
                </div>
                <div className="mt-4 flex flex-wrap gap-2"><Check_ ok={a.has_right_to_work} label="Right to work" /><Check_ ok={a.has_dbs} label="DBS" /></div>
                {(a.areas || a.availability_notes || a.about) && (
                  <div className="mt-4 space-y-1.5 rounded-xl bg-slate-50 p-4">
                    {a.areas && <Detail label="Areas">{a.areas}</Detail>}
                    {a.availability_notes && <Detail label="Availability">{a.availability_notes}</Detail>}
                    {a.about && <Detail label="About">{a.about}</Detail>}
                  </div>
                )}
              </article>
            </Panel>
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
    </AdminPage>
  );
}
