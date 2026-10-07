"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Save, Send, Mail, Phone, MapPin } from "lucide-react";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { BookingOps, FlagBanner, type OpsInvoice } from "@/components/admin/BookingOps";
import { BookingEdit } from "@/components/admin/BookingEdit";
import { ErrorState } from "@/components/admin/DataState";
import { AdminHero, AdminPage, BTN, INPUT } from "@/components/admin/kit";
import { Avatar, Panel, PanelHeader, StatusBadge } from "@/components/admin/ui";
import { activitySentence } from "@/lib/admin/overview-shared";
import { SERVICE_LABELS, type QuoteLineItem, type BookingStatus } from "@/types";

interface BookingDetail {
  id: string; reference: string; service_type: string; status: BookingStatus;
  clean_date: string | null; is_flexible_date: boolean; property_type: string | null;
  bedrooms: number | null; bathrooms: number | null; frequency: string | null;
  special_instructions: string | null; quote_line_items: QuoteLineItem[] | null;
  quote_total: number | null; quote_vat_rate: number | null; deposit_required: boolean;
  assigned_cleaner_id: string | null; clean_time: string | null;
  deposit_status: "unpaid" | "claimed" | "verified"; deposit_amount: number | null;
  is_flagged: boolean; flag_reason: string | null; clock_in_at: string | null; clock_out_at: string | null;
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
  const [invoices, setInvoices] = useState<OpsInvoice[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    let bookingRes, cleanersRes;
    try {
      [bookingRes, cleanersRes] = await Promise.all([
        fetch(`/api/admin/bookings/${id}`).then((r) => r.json()),
        fetch("/api/admin/cleaners").then((r) => r.json()),
      ]);
    } catch {
      setLoadError("Network error — check your connection.");
      setLoading(false);
      return;
    }
    if (!bookingRes.success) setLoadError(bookingRes.error ?? "Couldn't load this booking.");
    if (bookingRes.success) {
      setLoadError(null);
      setInvoices(bookingRes.invoices ?? []);
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

      if (andSend) {
        const sendRes = await fetch(`/api/admin/bookings/${id}/quote/send`, { method: "POST" });
        const sendData = await sendRes.json();
        if (!sendData.success) throw new Error(sendData.error || "Quote saved, but sending failed");
        toast.success("Quote saved and sent to the customer");
      } else {
        toast.success("Quote saved");
      }
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

  if (loadError && !booking) {
    return <AdminPage><ErrorState message={loadError} onRetry={() => { setLoading(true); load(); }} /></AdminPage>;
  }

  if (loading || !booking) {
    return <div className="flex h-96 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-brand-green-600" /></div>;
  }

  const when = booking.is_flexible_date ? "Flexible date" : booking.clean_date ? `${formatDate(booking.clean_date)}${booking.clean_time ? ` · ${booking.clean_time.slice(0, 5)}` : ""}` : "No date set";
  const history = [...statusHistory, ...activityLog].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <AdminPage>
      <AdminHero
        back={{ href: "/admin/bookings", label: "Bookings" }}
        eyebrow={SERVICE_LABELS[booking.service_type as keyof typeof SERVICE_LABELS]}
        title={booking.reference}
        description={booking.customer ? `${booking.customer.full_name}${booking.frequency && booking.frequency !== "one_off" ? ` · repeats ${booking.frequency}` : ""}` : undefined}
        stats={[
          { label: "Status", value: <StatusBadge status={booking.status} /> },
          { label: "When", value: <span className="text-[1.1rem]">{when}</span> },
          { label: "Cleaner", value: <span className="text-[1.1rem]">{booking.cleaner?.full_name ?? "Unassigned"}</span>, tone: booking.cleaner ? "default" : "warning", hint: booking.cleaner ? booking.cleaner.phone : "No cleaner yet" },
          { label: "Quote", value: booking.quote_total != null ? formatCurrency(Number(booking.quote_total)) : "—", hint: booking.deposit_amount != null ? `Deposit ${formatCurrency(Number(booking.deposit_amount))}` : undefined },
        ]}
      />

      <FlagBanner booking={booking} />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: customer + job details */}
        <div className="min-w-0 space-y-6 lg:col-span-1">
          <Panel>
            <PanelHeader title="Customer" />
            <div className="p-5">
              <div className="flex items-center gap-3">
                <Avatar name={booking.customer?.full_name ?? "Customer"} size={40} />
                <p className="font-medium text-slate-900">{booking.customer?.full_name}</p>
              </div>
              <ul className="mt-4 space-y-2 text-sm text-slate-600">
                <li className="flex items-start gap-2.5"><Mail className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /><span className="break-words">{booking.customer?.email}</span></li>
                <li className="flex items-center gap-2.5"><Phone className="h-4 w-4 shrink-0 text-slate-400" />{booking.customer?.phone}</li>
              </ul>
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Property" />
            <div className="space-y-3 p-5 text-sm">
              <p className="flex items-start gap-2.5 text-slate-800">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                {booking.address ? `${booking.address.line_1}${booking.address.line_2 ? ", " + booking.address.line_2 : ""}${booking.address.city ? ", " + booking.address.city : ""}, ${booking.address.postcode}` : "No address"}
              </p>
              <p className="text-slate-600">
                {booking.property_type} · {booking.bedrooms ?? "—"} bed · {booking.bathrooms ?? "—"} bath
                {booking.frequency && booking.frequency !== "one_off" ? ` · ${booking.frequency}` : ""}
              </p>
              {booking.special_instructions && <p className="rounded-xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">{booking.special_instructions}</p>}
            </div>
          </Panel>

          <BookingEdit key={`${booking.clean_date}-${booking.clean_time}-${booking.address?.postcode}`} booking={booking} onSaved={load} />

          <Panel>
            <PanelHeader title="Cleaner" hint="Changing this notifies the cleaner." />
            <div className="p-5">
              <select
                key={booking.assigned_cleaner_id ?? "unassigned"}
                defaultValue={booking.assigned_cleaner_id ?? ""}
                onChange={(e) => assignCleaner(e.target.value)}
                aria-label="Assigned cleaner"
                className={INPUT}
              >
                <option value="">Unassigned</option>
                {cleaners.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
              </select>
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Activity" hint="Status changes and automation, newest first." />
            {history.length === 0 ? <p className="px-5 py-8 text-center text-sm text-slate-500">No activity yet.</p> : (
              <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
                {history.map((entry) => (
                  <li key={entry.id} className="px-5 py-3">
                    <p className="text-sm text-slate-800">{entry.action ? activitySentence(entry.action) : `Status: ${entry.previous_status ?? "—"} → ${entry.new_status}`}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{new Date(entry.created_at).toLocaleString("en-GB")} · {entry.performed_by ?? entry.changed_by}</p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        {/* Right: ops + quote builder */}
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <BookingOps booking={booking} invoices={invoices} onChange={load} />

          <Panel>
            <PanelHeader title="Quote" hint="Sends by email, SMS and WhatsApp. The customer pays their deposit straight from the quote page." />
            <div className="p-5">
              <div className="space-y-2">
                {lineItems.map((line, i) => (
                  <div key={i} className="flex flex-wrap gap-2">
                    <input value={line.description} onChange={(e) => updateLine(i, "description", e.target.value)} placeholder="Description" aria-label="Line description" className={cn(INPUT, "basis-full sm:flex-1 sm:basis-0")} />
                    <input type="number" min={1} value={line.quantity} onChange={(e) => updateLine(i, "quantity", Number(e.target.value))} aria-label="Quantity" className={cn(INPUT, "w-20")} />
                    <input type="number" min={0} step={0.01} value={line.unit_price} onChange={(e) => updateLine(i, "unit_price", Number(e.target.value))} aria-label="Unit price" className={cn(INPUT, "w-28")} />
                    <div className="flex h-10 w-28 items-center justify-end rounded-lg bg-slate-50 px-3 text-sm font-semibold tabular-nums text-slate-900">{formatCurrency(line.total)}</div>
                    <button onClick={() => setLineItems((prev) => prev.filter((_, idx) => idx !== i))} aria-label="Remove line" className={`${BTN.icon} h-10 w-10 text-red-500 hover:text-red-700`}><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
              <button onClick={() => setLineItems((prev) => [...prev, { description: "", quantity: 1, unit_price: 0, total: 0 }])} className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand-green-700 hover:underline">
                <Plus className="h-4 w-4" /> Add line
              </button>

              <div className="mt-5 flex items-center gap-3">
                <label htmlFor="vat" className="text-sm text-slate-600">VAT %</label>
                <input id="vat" type="number" min={0} max={100} value={vatRate} onChange={(e) => setVatRate(Number(e.target.value))} className={cn(INPUT, "w-24")} />
              </div>

              <div className="mt-5 rounded-xl bg-slate-50 p-4">
                <div className="flex justify-between text-sm text-slate-600"><span>Subtotal</span><span className="tabular-nums">{formatCurrency(subtotal)}</span></div>
                {vatRate > 0 && <div className="mt-1 flex justify-between text-sm text-slate-600"><span>VAT ({vatRate}%)</span><span className="tabular-nums">{formatCurrency(vatAmount)}</span></div>}
                <div className="mt-3 flex justify-between border-t border-slate-200 pt-3 text-base font-semibold text-slate-900"><span>Total</span><span className="tabular-nums">{formatCurrency(total)}</span></div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button onClick={() => saveQuote(false)} disabled={saving} className={BTN.dark}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save quote
                </button>
                <button onClick={() => saveQuote(true)} disabled={sending} className={BTN.primary}>
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Save &amp; send
                </button>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </AdminPage>
  );
}
