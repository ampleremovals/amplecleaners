"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Camera, CheckCircle2, FileText, Loader2, MapPin, Sparkles, Landmark } from "lucide-react";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
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
    <div role="alert" className="mt-4 flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
      <div>
        <p className="font-semibold text-amber-900">Needs your attention</p>
        <p className="text-sm text-amber-800">{booking.flag_reason ?? "This booking has been flagged."}</p>
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
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-bold text-slate-900">Next step</h2>
          {awaitingDepositCheck && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-sky-50 p-4">
              <div className="flex items-start gap-3">
                <Landmark className="mt-0.5 h-5 w-5 text-sky-700" />
                <div>
                  <p className="font-semibold text-sky-900">Customer says they&apos;ve paid the deposit by bank transfer</p>
                  <p className="text-sm text-sky-800">Check the account for {booking.deposit_amount != null ? formatCurrency(Number(booking.deposit_amount)) : "the deposit"}, then confirm.</p>
                </div>
              </div>
              <button onClick={() => setConfirmDeposit(true)} className="rounded-xl bg-brand-green-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-green-800">Verify deposit</button>
            </div>
          )}
          {canAutoAssign && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-brand-green-50 p-4">
              <div className="flex items-start gap-3">
                <Sparkles className="mt-0.5 h-5 w-5 text-brand-green-700" />
                <div>
                  <p className="font-semibold text-brand-green-900">No cleaner assigned yet</p>
                  <p className="text-sm text-brand-green-800">Matches on DBS check, area, availability and workload.</p>
                </div>
              </div>
              <button onClick={autoAssign} disabled={busy === "assign"} className="inline-flex items-center gap-2 rounded-xl bg-brand-green-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-green-800 disabled:opacity-60">
                {busy === "assign" && <Loader2 className="h-4 w-4 animate-spin" />} Auto-assign
              </button>
            </div>
          )}
        </section>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-bold text-slate-900">Invoices</h2>
        {invoices.length === 0 ? (
          <p className="mt-2 text-sm text-slate-400">No invoices yet — the deposit invoice appears when the customer reserves, the balance when the job is completed.</p>
        ) : (
          <ul className="mt-2 divide-y divide-slate-100">
            {invoices.filter((i) => i.status !== "draft").map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <div>
                  <p className="font-semibold text-slate-800">{i.invoice_number} <span className="font-normal text-slate-400">· {TYPE_LABEL[i.type]}</span></p>
                  <p className="text-xs text-slate-400">{i.status === "paid" && i.paid_at ? `Paid ${formatDate(i.paid_at)}` : i.due_date ? `Due ${formatDate(i.due_date)}` : ""}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold tabular-nums">{formatCurrency(Number(i.total))}</span>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${i.status === "paid" ? "bg-brand-green-100 text-brand-green-800" : i.status === "cancelled" ? "bg-slate-100 text-slate-500" : "bg-amber-100 text-amber-800"}`}>{i.status === "sent" ? "unpaid" : i.status}</span>
                  <a href={`/api/invoices/${i.id}/pdf`} target="_blank" rel="noreferrer" aria-label={`Open PDF for ${i.invoice_number}`} className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-100"><FileText className="h-4 w-4" /></a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

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

  if (error) return <section className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</section>;
  if (!data) return <section className="flex justify-center rounded-xl border border-slate-200 bg-white p-8"><Loader2 className="h-5 w-5 animate-spin text-brand-green-600" /></section>;

  const done = data.tasks.filter((t) => t.done).length;
  const Grid = ({ label, urls }: { label: string; urls: string[] }) => (
    <div>
      <p className="text-xs font-medium text-slate-500">{label} ({urls.length})</p>
      {urls.length === 0 ? (
        <p className="mt-2 flex items-center gap-2 text-sm text-slate-400"><Camera className="h-4 w-4" /> None uploaded</p>
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

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="font-bold text-slate-900">On the day</h2>
      <div className="mt-3 flex flex-wrap gap-x-8 gap-y-2 text-sm">
        <p className="text-slate-600">
          Clocked in <strong>{data.clockInAt ? hhmm(data.clockInAt) : "—"}</strong>
          {data.clockIn && <a href={mapsUrl(data.clockIn)} target="_blank" rel="noreferrer" className="ml-1.5 inline-flex items-center text-brand-green-700 hover:underline"><MapPin className="h-3.5 w-3.5" /> map</a>}
        </p>
        <p className="text-slate-600">
          Clocked out <strong>{data.clockOutAt ? hhmm(data.clockOutAt) : "—"}</strong>
          {data.clockOut && <a href={mapsUrl(data.clockOut)} target="_blank" rel="noreferrer" className="ml-1.5 inline-flex items-center text-brand-green-700 hover:underline"><MapPin className="h-3.5 w-3.5" /> map</a>}
        </p>
        <p className="flex items-center gap-1.5 text-slate-600"><CheckCircle2 className="h-4 w-4 text-brand-green-600" /> Checklist <strong>{done}/{data.tasks.length}</strong></p>
      </div>
      <div className="mt-4 grid gap-5 sm:grid-cols-2">
        <Grid label="Before" urls={data.before} />
        <Grid label="After" urls={data.after} />
      </div>
    </section>
  );
}
