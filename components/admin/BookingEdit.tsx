"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ChevronDown, Loader2, Pencil } from "lucide-react";
import { BTN, INPUT, LABEL, TEXTAREA } from "@/components/admin/kit";
import { Panel } from "@/components/admin/ui";
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
    <Panel>
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left" aria-expanded={open}>
        <span>
          <span className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Pencil className="h-4 w-4 text-slate-400" /> Edit details</span>
          <span className="mt-0.5 block text-xs text-slate-500">Date, time, address and job notes.</span>
        </span>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="space-y-3 border-t border-slate-100 p-5">
          {!editable && <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">This job has started or finished, so its date, time and address are locked.</p>}
          <div className="grid grid-cols-2 gap-3">
            <label><span className={LABEL}>Date</span><input type="date" className={INPUT} value={f.cleanDate} disabled={!editable} onChange={(e) => set("cleanDate", e.target.value)} /></label>
            <label><span className={LABEL}>Time</span><input type="time" className={INPUT} value={f.cleanTime} disabled={!editable} onChange={(e) => set("cleanTime", e.target.value)} /></label>
          </div>
          <label className="block"><span className={LABEL}>Address line 1</span><input className={INPUT} value={f.line1} disabled={!editable} onChange={(e) => set("line1", e.target.value)} /></label>
          <div className="grid grid-cols-2 gap-3">
            <label><span className={LABEL}>City</span><input className={INPUT} value={f.city} disabled={!editable} onChange={(e) => set("city", e.target.value)} /></label>
            <label><span className={LABEL}>Postcode</span><input className={INPUT} value={f.postcode} disabled={!editable} onChange={(e) => set("postcode", e.target.value)} /></label>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <label><span className={LABEL}>Property</span>
              <select className={INPUT} value={f.propertyType} onChange={(e) => set("propertyType", e.target.value)}>{["flat", "house", "studio", "office", "other"].map((p) => <option key={p} value={p}>{p}</option>)}</select></label>
            <label><span className={LABEL}>Beds</span><input type="number" min={0} max={20} className={INPUT} value={f.bedrooms} onChange={(e) => set("bedrooms", Number(e.target.value))} /></label>
            <label><span className={LABEL}>Baths</span><input type="number" min={0} max={20} className={INPUT} value={f.bathrooms} onChange={(e) => set("bathrooms", Number(e.target.value))} /></label>
          </div>
          <label className="block"><span className={LABEL}>Repeats</span>
            <select className={INPUT} value={f.frequency} onChange={(e) => set("frequency", e.target.value)}>{["one_off", "weekly", "fortnightly", "monthly"].map((p) => <option key={p} value={p}>{p.replace("_", " ")}</option>)}</select></label>
          <label className="block"><span className={LABEL}>Notes for the cleaner</span><textarea rows={3} className={TEXTAREA} value={f.notes} onChange={(e) => set("notes", e.target.value)} /></label>

          {scheduleChanged && editable && (
            <label className="flex items-start gap-2.5 rounded-xl bg-amber-50 p-3.5 text-xs leading-relaxed text-amber-900">
              <input type="checkbox" className="mt-0.5 h-4 w-4 accent-brand-green-700" checked={f.notify} onChange={(e) => set("notify", e.target.checked)} />
              <span>Tell the customer the date/time changed (email, SMS, WhatsApp). The current cleaner will be released and a new one matched automatically.</span>
            </label>
          )}
          <button onClick={save} disabled={busy} className={BTN.primary}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Save changes
          </button>
        </div>
      )}
    </Panel>
  );
}
