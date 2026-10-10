"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, ArrowLeft, Check, Loader2, PauseCircle, PlayCircle, RotateCcw, Send } from "lucide-react";
import { useAdminFetch } from "@/hooks/useAdminFetch";
import { EmptyState, ErrorState } from "@/components/admin/DataState";
import { AdminHero, AdminPage, BTN, TEXTAREA } from "@/components/admin/kit";
import { Segmented } from "@/components/admin/controls";
import { Avatar, Panel, Pill } from "@/components/admin/ui";
import { formatWhen } from "@/components/admin/email/parts";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface Conversation { email: string; name: string | null; lastAt: string; lastDirection: "in" | "out"; subject: string | null; snippet: string; unread: number; open: boolean }
interface ListResp { success: boolean; conversations: Conversation[]; unreadTotal: number; total: number; receiving: { configured: boolean; address: string | null; webhookConfigured: boolean } }
interface Item { kind: "in" | "out" | "auto"; id: string; at: string; subject: string | null; body: string | null; bodyAvailable?: boolean; autoReply?: boolean; sentBy?: string | null; handled?: boolean }
interface ThreadResp {
  success: boolean; email: string; items: Item[]; lastSubject: string | null; contactName: string | null;
  customer: { id: string; name: string; phone: string; paused: boolean; pausedUntil: string | null } | null;
  bookings: { id: string; reference: string; service_type: string; status: string; clean_date: string | null }[];
}
type Filter = "open" | "unread" | "all";

async function post(url: string, body: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) throw new Error(json.error ?? "Something went wrong");
  return json;
}

function Thread({ email, onBack, onChanged }: { email: string; onBack: () => void; onChanged: () => void }) {
  const { data, loading, error, reload } = useAdminFetch<ThreadResp>(`/api/admin/inbox/thread?email=${encodeURIComponent(email)}`);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Opening a conversation marks it read.
  useEffect(() => { post("/api/admin/inbox/thread", { email, action: "read" }).then(onChanged).catch(() => undefined); }, [email]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [data?.items.length]);

  async function act(action: "handled" | "reopen" | "pause" | "resume", ok: string) {
    setBusy(action);
    try { await post("/api/admin/inbox/thread", { email, action }); toast.success(ok); reload(); onChanged(); } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } finally { setBusy(null); }
  }
  async function send() {
    setBusy("send");
    try { await post("/api/admin/inbox/reply", { email, body: reply }); setReply(""); toast.success("Reply sent"); reload(); onChanged(); } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't send"); } finally { setBusy(null); }
  }

  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (loading && !data) return <Skeleton className="h-96 w-full rounded-xl" />;
  if (!data) return null;
  const name = data.customer?.name ?? data.contactName ?? email;
  const lastIn = [...data.items].reverse().find((i) => i.kind === "in");

  return (
    <Panel className="min-h-[560px]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <button type="button" onClick={onBack} className={cn(BTN.icon, "lg:hidden")} aria-label="Back to conversations"><ArrowLeft className="h-4 w-4" /></button>
          <Avatar name={name} size={36} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">{name}</p>
            <p className="truncate text-xs text-slate-500">{email}{data.customer?.phone ? ` · ${data.customer.phone}` : ""}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {data.customer?.paused
            ? <button type="button" disabled={!!busy} className={BTN.secondary} onClick={() => act("resume", "Follow-ups will continue")}><PlayCircle className="h-4 w-4" /> Resume follow-ups</button>
            : <button type="button" disabled={!!busy} className={BTN.secondary} onClick={() => act("pause", "Follow-ups paused for 7 days")}><PauseCircle className="h-4 w-4" /> Pause follow-ups</button>}
          {lastIn && (lastIn.handled
            ? <button type="button" disabled={!!busy} className={BTN.secondary} onClick={() => act("reopen", "Reopened")}><RotateCcw className="h-4 w-4" /> Reopen</button>
            : <button type="button" disabled={!!busy} className={BTN.secondary} onClick={() => act("handled", "Marked as handled")}><Check className="h-4 w-4" /> Mark handled</button>)}
        </div>
      </header>
      {(data.customer?.paused || data.bookings.length > 0) && (
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50/60 px-5 py-2.5 text-xs text-slate-600">
          {data.customer?.paused && <Pill tone="warning">Sales follow-ups paused until {formatWhen(data.customer.pausedUntil)}</Pill>}
          {data.bookings.map((b) => <Link key={b.id} href={`/admin/bookings/${b.id}`} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 font-medium text-slate-700 hover:border-brand-green-600">{b.reference}</Link>)}
        </div>
      )}
      <div className="max-h-[52vh] min-h-[260px] flex-1 space-y-3 overflow-y-auto p-5">
        {data.items.length === 0 && <p className="py-10 text-center text-sm text-slate-500">No messages yet.</p>}
        {data.items.map((it) =>
          it.kind === "auto" ? (
            <p key={it.id} className="text-center text-xs text-slate-400">Automatic email sent: “{it.subject}” · {formatWhen(it.at)}</p>
          ) : (
            <div key={it.id} className={cn("flex", it.kind === "out" ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[85%] rounded-2xl px-4 py-2.5 text-sm", it.kind === "out" ? "rounded-br-md bg-brand-green-700 text-white" : "rounded-bl-md bg-slate-100 text-slate-900")}>
                {it.autoReply && <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide opacity-70">Automatic reply</p>}
                <p className="whitespace-pre-wrap break-words">{it.body ?? (it.bodyAvailable === false ? "The message text couldn't be loaded. Open it in your Resend dashboard under Emails → Receiving." : "")}</p>
                <p className={cn("mt-1 text-[11px]", it.kind === "out" ? "text-white/70" : "text-slate-500")}>{formatWhen(it.at)}{it.kind === "out" && it.sentBy ? ` · ${it.sentBy}` : ""}</p>
              </div>
            </div>
          ),
        )}
        <div ref={endRef} />
      </div>
      <div className="border-t border-slate-100 p-4">
        <textarea className={cn(TEXTAREA, "min-h-[96px]")} placeholder={`Reply to ${name.split(" ")[0]}…`} value={reply} onChange={(e) => setReply(e.target.value)} aria-label="Your reply" />
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-xs text-slate-500">Goes out as an email from Ample Cleaners. Their answer will appear here.</p>
          <button type="button" disabled={!reply.trim() || !!busy} className={BTN.primary} onClick={send}>{busy === "send" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send reply</button>
        </div>
      </div>
    </Panel>
  );
}

function InboxInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const selected = sp.get("email");
  const [filter, setFilter] = useState<Filter>("open");
  const { data, loading, error, reload } = useAdminFetch<ListResp>(`/api/admin/inbox?filter=${filter}`);
  const select = useCallback((email: string | null) => router.replace(email ? `/admin/inbox?email=${encodeURIComponent(email)}` : "/admin/inbox", { scroll: false }), [router]);

  return (
    <AdminPage>
      <AdminHero
        eyebrow="Growth"
        title="Inbox"
        description="When a customer replies to one of our emails it lands here, and their automatic sales follow-ups pause so nobody gets chased after writing back."
        stats={data ? [
          { label: "Unread", value: data.unreadTotal, hint: data.unreadTotal ? "Customers waiting for an answer" : "All caught up", tone: data.unreadTotal ? "warning" : "positive" },
          { label: "Conversations", value: data.total, hint: "All time" },
        ] : undefined}
      />
      {data && !data.receiving.configured && (
        <div role="status" className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <div className="space-y-1">
            <p><strong>Replies aren&apos;t reaching the Inbox yet.</strong> Customer replies still arrive in your normal mailbox, but the platform can&apos;t see them, so follow-ups won&apos;t pause by themselves.</p>
            <p>To switch it on: in Resend, open <strong>Emails → Receiving</strong>, copy your receiving address, and add it to Vercel as <code>INBOUND_REPLY_ADDRESS</code>. Then in the Resend webhook add the <code>email.received</code> event. Until then you can pause a customer by hand from any conversation.</p>
          </div>
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
        <div className={cn("space-y-3", selected && "hidden lg:block")}>
          <Segmented label="Show" value={filter} onChange={setFilter} options={[{ key: "open", label: "Open" }, { key: "unread", label: "Unread" }, { key: "all", label: "All" }]} />
          {error ? <ErrorState message={error} onRetry={reload} /> : loading && !data ? <Skeleton className="h-64 w-full rounded-xl" /> : !data?.conversations.length ? (
            <EmptyState title={filter === "all" ? "No conversations yet" : "Nothing waiting"} hint="Customer replies appear here as soon as they arrive." />
          ) : (
            <Panel>
              <ul className="divide-y divide-slate-100">
                {data.conversations.map((c) => (
                  <li key={c.email}>
                    <button type="button" onClick={() => select(c.email)} className={cn("flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-slate-50", selected === c.email && "bg-brand-green-50/70")}>
                      <Avatar name={c.name ?? c.email} size={34} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className={cn("truncate text-sm", c.unread ? "font-semibold text-slate-900" : "font-medium text-slate-800")}>{c.name ?? c.email}</span>
                          <span className="shrink-0 text-[11px] text-slate-400">{formatWhen(c.lastAt)}</span>
                        </span>
                        <span className="block truncate text-xs text-slate-500">{c.lastDirection === "out" ? "You: " : ""}{c.snippet || c.subject || "(no text)"}</span>
                      </span>
                      {c.unread > 0 && <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-brand-green-600" aria-label="Unread" />}
                    </button>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
        <div className={cn("min-w-0", !selected && "hidden lg:block")}>
          {selected ? <Thread key={selected} email={selected} onBack={() => select(null)} onChanged={reload} /> : <Panel className="min-h-[320px] items-center justify-center"><p className="px-6 text-center text-sm text-slate-500">Choose a conversation to read and reply.</p></Panel>}
        </div>
      </div>
    </AdminPage>
  );
}

export default function InboxPage() {
  return <Suspense fallback={null}><InboxInner /></Suspense>;
}
