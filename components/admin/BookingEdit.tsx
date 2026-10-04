"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ChevronDown, Loader2, Pencil } from "lucide-react";
import { isChangeable } from "@/lib/bookings/timing";

export interface EditableBooking {
  id: string;
  status: string;
  clean_date: string | null;
  clean_time: string | null;
  special_instructions: string | null;
  property_type: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  frequency: string | null;
  address: { line_1: string; line_2: string | null; city: string | null; postcode: string } | null;
}

const input = "h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-brand-green-600 disabled:bg-slate-50 disabled:text-slate-400";
const label = "mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500";

/** Edit a booking's schedule, address and job details. Moving the date/time re-matches the cleaner server-side. */
export function BookingEdit({ booking, onSaved }: { booking: EditableBooking; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const initialTime = booking.clean_time ? booking.clean_time.slice(0, 5) : "";
  const [f, setF] = useState({
    cleanDate: booking.clean_date ?? "", cleanTime: initialTime,
    line1: booking.address?.line_1 ?? "", line2: booking.address?.line_2 ?? "", city: booking.address?.city ?? "", postcode: booking.address?.postcode ?? "",
    propertyType: booking.property_type ?? "house", bedrooms: booking.bedrooms ?? 0, bathrooms: booking.bathrooms ?? 0,
    frequency: booking.frequency ?? "one_off", notes: booking.special_instructions ?? "", notify: true,
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const editable = isChangeable(booking.status);
  const scheduleChanged = f.cleanDate !== (booking.clean_date ?? "") || f.cleanTime !== initialTime;

  async function save() {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/bookings/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cleanDate: f.cleanDate || null,
          cleanTime: f.cleanTime || null,
          specialInstructions: f.notes || null,
          propertyType: f.propertyType, bedrooms: f.bedrooms, bathrooms: f.bathrooms, frequency: f.frequency,
          address: { line1: f.line1, line2: f.line2 || null, city: f.city || null, postcode: f.postcode },
          notifyCustomer: f.notify,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? "Couldn't save");
      toast.success(scheduleChanged ? (json.reassigned ? "Saved — a cleaner was re-matched" : "Saved") : "Booking updated");
      setOpen(false);
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between text-left" aria-expanded={open}>
        <h2 className="flex items-center gap-2 font-bold text-slate-900"><Pencil className="h-4 w-4 text-slate-400" /> Edit details</h2>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="mt-4 space-y-3">
          {!editable && <p className="rounded-lg bg-slate-50 p-2.5 text-xs text-slate-500">This job has started or finished, so its date, time and address are locked.</p>}
          <div className="grid grid-cols-2 gap-3">
            <label><span className={label}>Date</span><input type="date" className={input} value={f.cleanDate} disabled={!editable} onChange={(e) => set("cleanDate", e.target.value)} /></label>
            <label><span className={label}>Time</span><input type="time" className={input} value={f.cleanTime} disabled={!editable} onChange={(e) => set("cleanTime", e.target.value)} /></label>
          </div>
          <label className="block"><span className={label}>Address line 1</span><input className={input} value={f.line1} disabled={!editable} onChange={(e) => set("line1", e.target.value)} /></label>
          <div className="grid grid-cols-2 gap-3">
            <label><span className={label}>City</span><input className={input} value={f.city} disabled={!editable} onChange={(e) => set("city", e.target.value)} /></label>
            <label><span className={label}>Postcode</span><input className={input} value={f.postcode} disabled={!editable} onChange={(e) => set("postcode", e.target.value)} /></label>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <label><span className={label}>Property</span>
              <select className={input} value={f.propertyType} onChange={(e) => set("propertyType", e.target.value)}>{["flat", "house", "studio", "office", "other"].map((p) => <option key={p} value={p}>{p}</option>)}</select></label>
            <label><span className={label}>Beds</span><input type="number" min={0} max={20} className={input} value={f.bedrooms} onChange={(e) => set("bedrooms", Number(e.target.value))} /></label>
            <label><span className={label}>Baths</span><input type="number" min={0} max={20} className={input} value={f.bathrooms} onChange={(e) => set("bathrooms", Number(e.target.value))} /></label>
          </div>
          <label className="block"><span className={label}>Repeats</span>
            <select className={input} value={f.frequency} onChange={(e) => set("frequency", e.target.value)}>{["one_off", "weekly", "fortnightly", "monthly"].map((p) => <option key={p} value={p}>{p.replace("_", " ")}</option>)}</select></label>
          <label className="block"><span className={label}>Notes for the cleaner</span><textarea rows={3} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-green-600" value={f.notes} onChange={(e) => set("notes", e.target.value)} /></label>

          {scheduleChanged && editable && (
            <label className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
              <input type="checkbox" className="mt-0.5 h-4 w-4" checked={f.notify} onChange={(e) => set("notify", e.target.checked)} />
              <span>Tell the customer the date/time changed (email, SMS, WhatsApp). The current cleaner will be released and a new one matched automatically.</span>
            </label>
          )}
          <button onClick={save} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-brand-green-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-green-800 disabled:opacity-60">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Save changes
          </button>
        </div>
      )}
    </section>
  );
}
