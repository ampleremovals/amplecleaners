"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, RotateCcw, Send, Trash2 } from "lucide-react";
import { useAdminFetch } from "@/hooks/useAdminFetch";
import { ErrorState } from "@/components/admin/DataState";
import { Panel, PanelHeader, Pill } from "@/components/admin/ui";
import { BTN, Field, INPUT, TEXTAREA } from "@/components/admin/kit";
import { Segmented } from "@/components/admin/controls";
import { Switch, pct, type TemplateStat } from "@/components/admin/email/parts";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface Template {
  key: string; name: string; category: "service" | "marketing"; description: string | null; subject: string; heading: string; body: string;
  cta_label: string | null; cta_url: string | null; sms_body: string | null; whatsapp_body: string | null; subject_b: string | null;
  enabled: boolean; is_custom: boolean; used_by: string | null; edited: boolean;
}
interface Draft { name: string; subject: string; subject_b: string; heading: string; body: string; cta_label: string; cta_url: string; sms_body: string; whatsapp_body: string }

/** Details that only make sense in the alert sent to your own team. */
const TEAM_ONLY = ["customerName", "customerPhone", "customerEmail", "minutesWaiting", "adminLink"];

const toDraft = (t: Template): Draft => ({ name: t.name, subject: t.subject, subject_b: t.subject_b ?? "", heading: t.heading, body: t.body, cta_label: t.cta_label ?? "", cta_url: t.cta_url ?? "", sms_body: t.sms_body ?? "", whatsapp_body: t.whatsapp_body ?? "" });

async function call(url: string, method: string, body?: unknown) {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) throw new Error(json.error ?? `Request failed (${res.status})`);
  return json;
}

function Editor({ t, variables, stat, onChanged, onDeleted }: { t: Template; variables: Record<string, string>; stat: TemplateStat | undefined; onChanged: () => void; onDeleted: () => void }) {
  const [draft, setDraft] = useState<Draft>(toDraft(t));
  const [busy, setBusy] = useState<"save" | "test" | "reset" | "delete" | null>(null);
  const [preview, setPreview] = useState<{ subject: string; subjectB: string | null; sms: string | null; whatsapp: string | null; html: string; unknown: string[] } | null>(null);
  // Below 2xl the editor and the preview share the space: one at a time.
  const [view, setView] = useState<"edit" | "preview">("edit");
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(toDraft(t)), [draft, t]);
  const set = (k: keyof Draft, v: string) => setDraft((d) => ({ ...d, [k]: v }));
  const payload = useCallback(() => ({ name: draft.name, subject: draft.subject, subject_b: draft.subject_b || null, heading: draft.heading, body: draft.body, cta_label: draft.cta_label || null, cta_url: draft.cta_url || null, sms_body: draft.sms_body || null, whatsapp_body: draft.whatsapp_body || null }), [draft]);

  // live preview while typing (debounced)
  useEffect(() => {
    const h = setTimeout(async () => {
      try {
        const j = await call(`/api/admin/email/templates/${t.key}/preview`, "POST", { draft: payload() });
        setPreview({ subject: j.subject, subjectB: j.subjectB, sms: j.sms, whatsapp: j.whatsapp, html: j.html, unknown: j.unknownVariables });
      } catch { /* the draft may be mid-edit and momentarily invalid */ }
    }, 350);
    return () => clearTimeout(h);
  }, [t.key, payload]);

  function insertVariable(name: string) {
    const el = bodyRef.current;
    const token = `{{${name}}}`;
    if (!el) return set("body", draft.body + token);
    const { selectionStart: a, selectionEnd: b } = el;
    set("body", draft.body.slice(0, a) + token + draft.body.slice(b));
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(a + token.length, a + token.length); });
  }

  async function run<T>(kind: NonNullable<typeof busy>, fn: () => Promise<T>, ok: string) {
    setBusy(kind);
    try { await fn(); toast.success(ok); } catch (e) { toast.error(e instanceof Error ? e.message : "Something went wrong"); } finally { setBusy(null); }
  }

  return (
    <div className="space-y-4 2xl:grid 2xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] 2xl:gap-4 2xl:space-y-0">
      <div className="2xl:hidden"><Segmented label="Editor or preview" value={view} onChange={setView} options={[{ key: "edit", label: "Edit" }, { key: "preview", label: "Preview" }]} /></div>
      <Panel className={view === "preview" ? "hidden 2xl:flex" : ""}>
        <PanelHeader
          title={t.name}
          hint={t.description ?? undefined}
          right={<div className="flex items-center gap-2"><span className="text-xs font-medium text-slate-500">{t.enabled ? "On" : "Off"}</span><Switch checked={t.enabled} label={`${t.name} enabled`} onChange={(v) => run("save", async () => { await call(`/api/admin/email/templates/${t.key}`, "PATCH", { enabled: v }); onChanged(); }, v ? "Template on" : "Template off")} /></div>}
        />
        <div className="space-y-4 p-5">
          <div className="flex flex-wrap gap-2">
            <Pill tone={t.category === "marketing" ? "info" : "neutral"}>{t.category === "marketing" ? "Marketing (has unsubscribe link)" : "About their booking"}</Pill>
            {t.used_by && <Pill>Used by: {t.used_by}</Pill>}
            {t.edited && <Pill tone="warning">Edited from default</Pill>}
          </div>
          {t.is_custom && <Field label="Template name"><input className={INPUT} value={draft.name} onChange={(e) => set("name", e.target.value)} /></Field>}
          <Field label="Subject line"><input className={INPUT} value={draft.subject} onChange={(e) => set("subject", e.target.value)} maxLength={200} /></Field>
          <Field label="Test a second subject line (optional)"><input className={INPUT} value={draft.subject_b} onChange={(e) => set("subject_b", e.target.value)} maxLength={200} placeholder="Half your customers see this one instead; the Results tab shows which gets opened more" /></Field>
          <Field label="Heading (the green bar)"><input className={INPUT} value={draft.heading} onChange={(e) => set("heading", e.target.value)} maxLength={150} /></Field>
          <Field label="Message">
            <textarea ref={bodyRef} className={cn(TEXTAREA, "min-h-[220px] font-mono text-[13px] leading-relaxed")} value={draft.body} onChange={(e) => set("body", e.target.value)} />
          </Field>
          <p className="-mt-2 text-xs text-slate-500">Leave a blank line between paragraphs. Start lines with <code>- </code> for bullets. Use <code>**bold**</code> and <code>[link text](https://…)</code>.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Button text (optional)"><input className={INPUT} value={draft.cta_label} onChange={(e) => set("cta_label", e.target.value)} maxLength={60} /></Field>
            <Field label="Button link"><input className={INPUT} value={draft.cta_url} onChange={(e) => set("cta_url", e.target.value)} placeholder="{{quoteLink}} or https://…" /></Field>
          </div>
          {t.category === "service" ? (
            <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50/60 p-4">
              <p className="text-xs text-slate-500">Also sent as a text message. Only for messages about their own booking, and only if SMS/WhatsApp are switched on in Settings. Leave empty to send the email only.</p>
              <Field label="SMS"><textarea className={cn(TEXTAREA, "min-h-[72px]")} value={draft.sms_body} onChange={(e) => set("sms_body", e.target.value)} maxLength={480} /></Field>
              <Field label="WhatsApp"><textarea className={cn(TEXTAREA, "min-h-[72px]")} value={draft.whatsapp_body} onChange={(e) => set("whatsapp_body", e.target.value)} maxLength={1000} /></Field>
            </div>
          ) : null}
          <div>
            <p className="mb-1.5 text-xs font-medium text-slate-500">Click to insert a personal detail into the message</p>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(variables).filter(([name]) => t.key === "lead_sla_alert" || !TEAM_ONLY.includes(name)).map(([name, hint]) => (
                <button key={name} type="button" title={hint} onClick={() => insertVariable(name)} className="rounded-md border border-slate-200 bg-white px-2 py-1 font-mono text-[11.5px] text-slate-700 transition-colors hover:border-brand-green-600 hover:bg-brand-green-50">{`{{${name}}}`}</button>
              ))}
            </div>
          </div>
          {preview && preview.unknown.length > 0 && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800">Not a known detail: {preview.unknown.map((u) => `{{${u}}}`).join(", ")}. It would be blank in the email.</p>}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-5 py-3">
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={!!busy} className={BTN.secondary} onClick={() => run("test", () => call(`/api/admin/email/templates/${t.key}/preview`, "POST", { draft: payload(), send: true }), "Test email sent to you")}>
              {busy === "test" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send me a test
            </button>
            {!t.is_custom || t.edited ? (
              <button type="button" disabled={!!busy} className={BTN.secondary} onClick={() => { if (confirm("Restore the original wording? Your edits to this template will be lost.")) run("reset", async () => { await call(`/api/admin/email/templates/${t.key}`, "PATCH", { reset: true }); onChanged(); }, "Restored the default"); }}>
                <RotateCcw className="h-4 w-4" /> Restore default
              </button>
            ) : null}
            {t.is_custom && (
              <button type="button" disabled={!!busy} className={BTN.danger} onClick={() => { if (confirm("Delete this template?")) run("delete", async () => { await call(`/api/admin/email/templates/${t.key}`, "DELETE"); onDeleted(); }, "Template deleted"); }}>
                <Trash2 className="h-4 w-4" /> Delete
              </button>
            )}
          </div>
          <button type="button" disabled={!dirty || !!busy} className={BTN.primary} onClick={() => run("save", async () => { await call(`/api/admin/email/templates/${t.key}`, "PATCH", payload()); onChanged(); }, "Template saved")}>
            {busy === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
          </button>
        </div>
      </Panel>

      <Panel className={cn("self-start", view === "edit" && "hidden 2xl:flex")}>
        <PanelHeader title="Preview" hint="With sample details. Updates as you type." />
        <div className="space-y-3 p-5">
          <p className="truncate text-sm"><span className="text-slate-500">Subject{preview?.subjectB ? " A" : ""}: </span><span className="font-medium text-slate-900">{preview?.subject ?? "…"}</span></p>
          {preview?.subjectB && <p className="truncate text-sm"><span className="text-slate-500">Subject B: </span><span className="font-medium text-slate-900">{preview.subjectB}</span></p>}
          {stat?.variants && (stat.variants.A.sent > 0 || stat.variants.B.sent > 0) && t.subject_b && (
            <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
              <strong className="text-slate-500">Subject test so far: </strong>
              A: {stat.variants.A.sent} sent, {pct(stat.variants.A.opened, stat.variants.A.sent)} opened · B: {stat.variants.B.sent} sent, {pct(stat.variants.B.opened, stat.variants.B.sent)} opened
              {Math.min(stat.variants.A.sent, stat.variants.B.sent) < 30 ? ". Too few to call a winner yet; wait for at least 30 sends each." : ""}
            </p>
          )}
          {(preview?.sms || preview?.whatsapp) && (
            <div className="space-y-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
              {preview.sms && <p><strong className="text-slate-500">SMS: </strong>{preview.sms}</p>}
              {preview.whatsapp && <p><strong className="text-slate-500">WhatsApp: </strong>{preview.whatsapp}</p>}
            </div>
          )}
          <iframe title="Email preview" sandbox="" srcDoc={preview?.html ?? ""} className="h-[560px] w-full rounded-lg border border-slate-200 bg-slate-100" />
        </div>
      </Panel>
    </div>
  );
}

export function TemplatesTab({ variables, stats, focusKey, onChanged }: { variables: Record<string, string>; stats: TemplateStat[]; focusKey: string | null; onChanged: () => void }) {
  const { data, loading, error, reload } = useAdminFetch<{ success: boolean; templates: Template[] }>("/api/admin/email/templates");
  const [selected, setSelected] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const templates = data?.templates ?? [];
  const current = templates.find((t) => t.key === (selected ?? focusKey)) ?? templates[0];

  useEffect(() => { if (focusKey) setSelected(focusKey); }, [focusKey]);

  async function create() {
    try {
      const j = await call("/api/admin/email/templates", "POST", { name: newName, subject: "Subject line", heading: "Heading", body: "Hi {{firstName}},\n\nWrite your message here." });
      toast.success("Template created");
      setCreating(false); setNewName("");
      await reload();
      setSelected(j.key);
      onChanged();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't create"); }
  }

  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (loading && !data) return <Skeleton className="h-96 w-full rounded-xl" />;

  const groups = [
    { title: "About their booking", items: templates.filter((t) => t.category === "service") },
    { title: "Marketing and win-back", items: templates.filter((t) => t.category === "marketing" && !t.is_custom) },
    { title: "Campaign templates", items: templates.filter((t) => t.is_custom) },
  ];
  return (
    <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
      <Panel className="self-start">
        <div className="max-h-[70vh] overflow-y-auto p-2">
          {groups.map((g) => g.items.length > 0 && (
            <div key={g.title} className="mb-2">
              <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{g.title}</p>
              {g.items.map((t) => (
                <button key={t.key} type="button" onClick={() => setSelected(t.key)} className={cn("flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-[13px] transition-colors", current?.key === t.key ? "bg-brand-green-50 font-semibold text-brand-green-900" : "text-slate-700 hover:bg-slate-50")}>
                  <span className="min-w-0 truncate">{t.name}</span>
                  {!t.enabled && <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">Off</span>}
                </button>
              ))}
            </div>
          ))}
        </div>
        <div className="border-t border-slate-100 p-3">
          {creating ? (
            <div className="space-y-2">
              <input className={INPUT} autoFocus placeholder="Template name" value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && newName.trim().length > 1 && create()} />
              <div className="flex gap-2"><button type="button" className={cn(BTN.primary, "flex-1")} disabled={newName.trim().length < 2} onClick={create}>Create</button><button type="button" className={BTN.secondary} onClick={() => setCreating(false)}>Cancel</button></div>
            </div>
          ) : (
            <button type="button" className={cn(BTN.secondary, "w-full")} onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> New campaign template</button>
          )}
        </div>
      </Panel>
      <div className="min-w-0">
        {current && <Editor key={current.key} t={current} variables={variables} stat={stats.find((s) => s.key === current.key)} onChanged={() => { reload(); onChanged(); }} onDeleted={() => { setSelected(null); reload(); onChanged(); }} />}
      </div>
    </div>
  );
}
