"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Camera, CheckCircle2, FileText, Loader2, MapPin, Sparkles, Landmark } from "lucide-react";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { BTN } from "@/components/admin/kit";
import { Panel, PanelHeader, Pill } from "@/components/admin/ui";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { BookingStatus, CleaningTask } from "@/types";

export interface OpsBooking {
  id: string;
  status: BookingStatus;
  assigned_cleaner_id: string | null;
  clean_date: string | null;
  deposit_status: "unpaid" | "claimed" | "verified";
  deposit_amount: number | null;
  is_flagged: boolean;
  flag_reason: string | null;
  clock_in_at: string | null;
  clock_out_at: string | null;
}

export interface OpsInvoice {
  id: string; invoice_number: string; type: "deposit" | "full_balance" | "recurring";
  status: "draft" | "sent" | "paid" | "cancelled"; total: number; due_date: string | null; paid_at: string | null;
}

const TYPE_LABEL = { deposit: "Deposit", full_balance: "Balance", recurring: "Visit" } as const;
const JOB_STARTED: BookingStatus[] = ["in_progress", "job_completed", "invoice_sent", "paid"];

async function post(url: string): Promise<{ ok: boolean; message?: string }> {
  const res = await fetch(url, { method: "POST" });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok && json.success !== false, message: json.error ?? json.reason };
}

/** Red/amber banner for anything automation couldn't resolve on its own. */
export function FlagBanner({ booking }: { booking: OpsBooking }) {
  if (!booking.is_flagged) return null;
  return (
    <div role="alert" className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700"><AlertTriangle className="h-5 w-5" /></span>
      <div>
        <p className="font-semibold text-amber-950">Needs your attention</p>
        <p className="text-sm text-amber-900/80">{booking.flag_reason ?? "This booking has been flagged."}</p>
      </div>
    </div>
  );
}

/** Deposit verification + auto-assign + invoices + on-the-day proof, for the right-hand column. */
export function BookingOps({ booking, invoices, onChange }: { booking: OpsBooking; invoices: OpsInvoice[]; onChange: () => void }) {
  const [busy, setBusy] = useState<"assign" | "deposit" | null>(null);
  const [confirmDeposit, setConfirmDeposit] = useState(false);

  const canAutoAssign = booking.status === "booking_confirmed" && !booking.assigned_cleaner_id;
  const awaitingDepositCheck = booking.deposit_status === "claimed" && !["booking_confirmed", "cleaner_assigned", "in_progress", "job_completed", "invoice_sent", "paid"].includes(booking.status);

  async function autoAssign() {
    setBusy("assign");
    const r = await post(`/api/admin/bookings/${booking.id}/auto-assign`);
    setBusy(null);
    if (r.ok) toast.success("Cleaner assigned and notified");
    else toast.error(r.message ?? "Couldn't auto-assign");
    onChange();
  }

  async function verifyDeposit() {
    setBusy("deposit");
    const r = await post(`/api/admin/bookings/${booking.id}/verify-deposit`);
    setBusy(null);
    setConfirmDeposit(false);
    if (r.ok) toast.success("Deposit verified — booking confirmed");
    else toast.error(r.message ?? "Couldn't verify the deposit");
    onChange();
  }

  return (
    <div className="space-y-6">
      {(awaitingDepositCheck || canAutoAssign) && (
        <Panel>
          <PanelHeader title="Next step" hint="This booking is waiting on you." />
          <div className="space-y-3 p-5">
            {awaitingDepositCheck && (
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-sky-100 bg-sky-50 p-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-sky-700 shadow-sm"><Landmark className="h-5 w-5" /></span>
                  <div>
                    <p className="font-semibold text-sky-950">Customer says they&apos;ve paid the deposit by bank transfer</p>
                    <p className="text-sm text-sky-900/80">Check the account for {booking.deposit_amount != null ? formatCurrency(Number(booking.deposit_amount)) : "the deposit"}, then confirm.</p>
                  </div>
                </div>
                <button onClick={() => setConfirmDeposit(true)} className={BTN.primary}>Verify deposit</button>
              </div>
            )}
            {canAutoAssign && (
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-700 shadow-sm"><Sparkles className="h-5 w-5" /></span>
                  <div>
                    <p className="font-semibold text-emerald-950">No cleaner assigned yet</p>
                    <p className="text-sm text-emerald-900/80">Matches on DBS check, area, availability and workload.</p>
                  </div>
                </div>
                <button onClick={autoAssign} disabled={busy === "assign"} className={BTN.primary}>
                  {busy === "assign" && <Loader2 className="h-4 w-4 animate-spin" />} Auto-assign
                </button>
              </div>
            )}
          </div>
        </Panel>
      )}

      <Panel>
        <PanelHeader title="Invoices" hint="Deposit when the customer reserves; balance when the job is completed." />
        {invoices.filter((i) => i.status !== "draft").length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-500">No invoices yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {invoices.filter((i) => i.status !== "draft").map((i) => (
              <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 text-sm">
                <div>
                  <p className="font-medium text-slate-900">{i.invoice_number} <span className="font-normal text-slate-500">· {TYPE_LABEL[i.type]}</span></p>
                  <p className="text-xs text-slate-500">{i.status === "paid" && i.paid_at ? `Paid ${formatDate(i.paid_at)}` : i.due_date ? `Due ${formatDate(i.due_date)}` : ""}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold tabular-nums text-slate-900">{formatCurrency(Number(i.total))}</span>
                  <Pill tone={i.status === "paid" ? "positive" : i.status === "cancelled" ? "neutral" : "warning"}>{i.status === "sent" ? "Unpaid" : i.status === "paid" ? "Paid" : "Cancelled"}</Pill>
                  <a href={`/api/invoices/${i.id}/pdf`} target="_blank" rel="noreferrer" aria-label={`Open PDF for ${i.invoice_number}`} className={BTN.icon}><FileText className="h-4 w-4" /></a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {JOB_STARTED.includes(booking.status) && <JobProof bookingId={booking.id} />}

      <ConfirmDialog
        open={confirmDeposit}
        onOpenChange={setConfirmDeposit}
        title="Verify the deposit?"
        description="This confirms the booking, tells the customer their date is locked in, and assigns a cleaner automatically."
        confirmLabel="Yes, the money's landed"
        busy={busy === "deposit"}
        onConfirm={verifyDeposit}
      />
    </div>
  );
}

interface ProofResponse {
  success: boolean; before: string[]; after: string[];
  clockInAt: string | null; clockOutAt: string | null;
  clockIn: { lat: number; lng: number } | null; clockOut: { lat: number; lng: number } | null;
  tasks: CleaningTask[];
}

const hhmm = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
const mapsUrl = (p: { lat: number; lng: number }) => `https://www.google.com/maps?q=${p.lat},${p.lng}`;

function PhotoGrid({ label, urls }: { label: string; urls: string[] }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-500">{label} ({urls.length})</p>
      {urls.length === 0 ? (
        <p className="mt-2 flex items-center gap-2 text-sm text-slate-500"><Camera className="h-4 w-4" /> None uploaded</p>
      ) : (
        <div className="mt-2 grid grid-cols-3 gap-2">
          {urls.map((u) => (
            <a key={u} href={u} target="_blank" rel="noreferrer">
              {/* Signed URLs expire, so next/image optimisation would only cache a dead link. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt={`${label} photo`} loading="lazy" className="aspect-square w-full rounded-lg object-cover ring-1 ring-slate-200" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

/** What the cleaner actually did on the day: times, location stamps, checklist, photos. */
function JobProof({ bookingId }: { bookingId: string }) {
  const [data, setData] = useState<ProofResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/bookings/${bookingId}/photos`)
      .then((r) => r.json())
      .then((j) => { if (cancelled) return; if (j.success) setData(j); else setError(j.error ?? "Couldn't load job proof"); })
      .catch(() => !cancelled && setError("Couldn't load job proof"));
    return () => { cancelled = true; };
  }, [bookingId]);

  if (error) return <Panel><p className="p-5 text-sm text-red-700">{error}</p></Panel>;
  if (!data) return <Panel><div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin text-brand-green-600" /></div></Panel>;

  const done = data.tasks.filter((t) => t.done).length;

  return (
    <Panel>
      <PanelHeader title="On the day" hint="What the cleaner did: times, location stamps, checklist and photos." />
      <div className="p-5">
        <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
          <p className="text-slate-600">
            Clocked in <strong className="text-slate-900">{data.clockInAt ? hhmm(data.clockInAt) : "—"}</strong>
            {data.clockIn && <a href={mapsUrl(data.clockIn)} target="_blank" rel="noreferrer" className="ml-1.5 inline-flex items-center text-brand-green-700 hover:underline"><MapPin className="h-3.5 w-3.5" /> map</a>}
          </p>
          <p className="text-slate-600">
            Clocked out <strong className="text-slate-900">{data.clockOutAt ? hhmm(data.clockOutAt) : "—"}</strong>
            {data.clockOut && <a href={mapsUrl(data.clockOut)} target="_blank" rel="noreferrer" className="ml-1.5 inline-flex items-center text-brand-green-700 hover:underline"><MapPin className="h-3.5 w-3.5" /> map</a>}
          </p>
          <p className="flex items-center gap-1.5 text-slate-600"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Checklist <strong className="text-slate-900">{done}/{data.tasks.length}</strong></p>
        </div>
        <div className="mt-5 grid gap-6 sm:grid-cols-2">
          <PhotoGrid label="Before" urls={data.before} />
          <PhotoGrid label="After" urls={data.after} />
        </div>
      </div>
    </Panel>
  );
}
