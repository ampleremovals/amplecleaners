"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Save, Send } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { SERVICE_LABELS, BOOKING_STATUS_LABELS, type QuoteLineItem, type BookingStatus } from "@/types";

interface BookingDetail {
  id: string; reference: string; service_type: string; status: BookingStatus;
  clean_date: string | null; is_flexible_date: boolean; property_type: string | null;
  bedrooms: number | null; bathrooms: number | null; frequency: string | null;
  special_instructions: string | null; quote_line_items: QuoteLineItem[] | null;
  quote_total: number | null; quote_vat_rate: number | null; deposit_required: boolean;
  assigned_cleaner_id: string | null;
  customer: { id: string; full_name: string; email: string; phone: string } | null;
  address: { line_1: string; line_2: string | null; city: string | null; postcode: string } | null;
  cleaner: { id: string; full_name: string; phone: string } | null;
}

interface Cleaner { id: string; full_name: string; is_active: boolean; }
interface LogEntry { id: string; action?: string; new_status?: string; previous_status?: string | null; created_at: string; performed_by?: string; changed_by?: string; }

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [statusHistory, setStatusHistory] = useState<LogEntry[]>([]);
  const [activityLog, setActivityLog] = useState<LogEntry[]>([]);
  const [cleaners, setCleaners] = useState<Cleaner[]>([]);
  const [lineItems, setLineItems] = useState<QuoteLineItem[]>([{ description: "", quantity: 1, unit_price: 0, total: 0 }]);
  const [vatRate, setVatRate] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    const [bookingRes, cleanersRes] = await Promise.all([
      fetch(`/api/admin/bookings/${id}`).then((r) => r.json()),
      fetch("/api/admin/cleaners").then((r) => r.json()),
    ]);
    if (bookingRes.success) {
      setBooking(bookingRes.booking);
      setStatusHistory(bookingRes.statusHistory);
      setActivityLog(bookingRes.activityLog);
      if (bookingRes.booking.quote_line_items?.length) setLineItems(bookingRes.booking.quote_line_items);
      setVatRate(Number(bookingRes.booking.quote_vat_rate) || 0);
    }
    if (cleanersRes.success) setCleaners(cleanersRes.cleaners.filter((c: Cleaner) => c.is_active));
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const subtotal = lineItems.reduce((s, l) => s + (Number(l.total) || 0), 0);
  const vatAmount = Math.round(subtotal * (vatRate / 100) * 100) / 100;
  const total = Math.round((subtotal + vatAmount) * 100) / 100;

  function updateLine(i: number, field: keyof QuoteLineItem, value: string | number) {
    setLineItems((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value };
      if (field === "quantity" || field === "unit_price") next[i].total = Number(next[i].quantity) * Number(next[i].unit_price);
      return next;
    });
  }

  async function saveQuote(andSend: boolean) {
    if (andSend) setSending(true); else setSaving(true);
    try {
      const res = await fetch(`/api/admin/bookings/${id}/quote`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lineItems, vatRate, depositRequired: booking?.deposit_required ?? true }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      toast.success(andSend ? "Quote saved — sending isn't wired up yet (Phase 3)" : "Quote saved");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save quote");
    } finally {
      setSaving(false);
      setSending(false);
    }
  }

  async function assignCleaner(cleanerId: string) {
    const res = await fetch(`/api/admin/bookings/${id}/assign-cleaner`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cleanerId: cleanerId || null }),
    });
    const data = await res.json();
    if (data.success) { toast.success("Cleaner updated"); load(); }
    else toast.error(data.error || "Failed to assign cleaner");
  }

  if (loading || !booking) {
    return <div className="flex h-96 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-brand-teal-600" /></div>;
  }

  return (
    <div className="p-6 sm:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-slate-900">{booking.reference}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {SERVICE_LABELS[booking.service_type as keyof typeof SERVICE_LABELS]} · {BOOKING_STATUS_LABELS[booking.status]}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Left: customer + job details */}
        <div className="space-y-6 lg:col-span-1">
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="font-bold text-slate-900">Customer</h2>
            <p className="mt-2 text-sm text-slate-700">{booking.customer?.full_name}</p>
            <p className="text-sm text-slate-500">{booking.customer?.email}</p>
            <p className="text-sm text-slate-500">{booking.customer?.phone}</p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="font-bold text-slate-900">Property</h2>
            <p className="mt-2 text-sm text-slate-700">
              {booking.address ? `${booking.address.line_1}${booking.address.line_2 ? ", " + booking.address.line_2 : ""}, ${booking.address.postcode}` : "No address"}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {booking.property_type} · {booking.bedrooms ?? "—"} bed · {booking.bathrooms ?? "—"} bath
              {booking.frequency && booking.frequency !== "one_off" ? ` · ${booking.frequency}` : ""}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {booking.is_flexible_date ? "Flexible date" : booking.clean_date ? formatDate(booking.clean_date) : "No date set"}
            </p>
            {booking.special_instructions && (
              <p className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">{booking.special_instructions}</p>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="font-bold text-slate-900">Cleaner</h2>
            <select
              defaultValue={booking.assigned_cleaner_id ?? ""}
              onChange={(e) => assignCleaner(e.target.value)}
              className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
            >
              <option value="">Unassigned</option>
              {cleaners.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
            </select>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="font-bold text-slate-900">Activity</h2>
            <div className="mt-2 max-h-72 space-y-2 overflow-y-auto text-xs">
              {[...statusHistory, ...activityLog]
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .map((entry) => (
                  <div key={entry.id} className="border-b border-slate-100 pb-2">
                    <p className="text-slate-600">{entry.action ?? `Status: ${entry.previous_status ?? "—"} → ${entry.new_status}`}</p>
                    <p className="text-slate-400">{new Date(entry.created_at).toLocaleString("en-GB")} · {entry.performed_by ?? entry.changed_by}</p>
                  </div>
                ))}
              {statusHistory.length === 0 && activityLog.length === 0 && <p className="text-slate-400">No activity yet.</p>}
            </div>
          </section>
        </div>

        {/* Right: quote builder */}
        <div className="lg:col-span-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="font-bold text-slate-900">Quote</h2>
            <div className="mt-3 space-y-2">
              {lineItems.map((line, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    value={line.description}
                    onChange={(e) => updateLine(i, "description", e.target.value)}
                    placeholder="Description"
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                  <input
                    type="number" min={1} value={line.quantity}
                    onChange={(e) => updateLine(i, "quantity", Number(e.target.value))}
                    className="w-16 rounded-lg border border-slate-200 px-2 py-2 text-sm"
                  />
                  <input
                    type="number" min={0} step={0.01} value={line.unit_price}
                    onChange={(e) => updateLine(i, "unit_price", Number(e.target.value))}
                    className="w-24 rounded-lg border border-slate-200 px-2 py-2 text-sm"
                  />
                  <div className="flex w-24 items-center justify-end rounded-lg bg-slate-50 px-2 text-sm font-semibold">
                    {formatCurrency(line.total)}
                  </div>
                  <button onClick={() => setLineItems((prev) => prev.filter((_, idx) => idx !== i))} className="rounded-lg p-2 text-red-500 hover:bg-red-50">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() => setLineItems((prev) => [...prev, { description: "", quantity: 1, unit_price: 0, total: 0 }])}
              className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-brand-teal-700"
            >
              <Plus className="h-4 w-4" /> Add line
            </button>

            <div className="mt-4 flex items-center gap-2">
              <label className="text-sm text-slate-600">VAT %</label>
              <input type="number" min={0} max={100} value={vatRate} onChange={(e) => setVatRate(Number(e.target.value))} className="w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-sm" />
            </div>

            <div className="mt-4 rounded-xl bg-slate-50 p-4">
              <div className="flex justify-between text-sm text-slate-600"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
              {vatRate > 0 && <div className="flex justify-between text-sm text-slate-600"><span>VAT ({vatRate}%)</span><span>{formatCurrency(vatAmount)}</span></div>}
              <div className="mt-2 flex justify-between border-t border-slate-200 pt-2 text-base font-bold text-slate-900"><span>Total</span><span>{formatCurrency(total)}</span></div>
            </div>

            <div className="mt-4 flex gap-3">
              <button onClick={() => saveQuote(false)} disabled={saving} className="flex items-center gap-2 rounded-xl bg-slate-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save quote
              </button>
              <button onClick={() => saveQuote(true)} disabled={sending} className="flex items-center gap-2 rounded-xl bg-brand-teal-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-teal-800 disabled:opacity-50">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Save &amp; send
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              &ldquo;Save &amp; send&rdquo; currently only saves — the quote-delivery email/SMS/WhatsApp flow is Phase 3.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
