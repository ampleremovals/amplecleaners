"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, ShieldCheck } from "lucide-react";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface Cleaner { id: string; full_name: string; email: string; phone: string; is_active: boolean; dbs_verified: boolean; pay_rate_per_hour: number | null; }
interface Slot { id: string; day_of_week: number; start_time: string; end_time: string; }
interface Area { id: string; postcode_prefix: string; }
interface Job { id: string; reference: string; clean_date: string | null; status: string; }

export default function CleanerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [cleaner, setCleaner] = useState<Cleaner | null>(null);
  const [availability, setAvailability] = useState<Slot[]>([]);
  const [coverage, setCoverage] = useState<Area[]>([]);
  const [upcomingJobs, setUpcomingJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSlot, setNewSlot] = useState({ dayOfWeek: 1, startTime: "09:00", endTime: "17:00" });
  const [newArea, setNewArea] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/cleaners/${id}`).then((r) => r.json());
    if (res.success) {
      setCleaner(res.cleaner);
      setAvailability(res.availability);
      setCoverage(res.coverage);
      setUpcomingJobs(res.upcomingJobs);
    }
    setLoading(false);
  }, [id]);
  useEffect(() => { load(); }, [load]);

  async function toggleDbs() {
    if (!cleaner) return;
    const res = await fetch(`/api/admin/cleaners/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dbs_verified: !cleaner.dbs_verified }),
    });
    if ((await res.json()).success) { toast.success("DBS status updated"); load(); }
  }

  async function addSlot() {
    const res = await fetch(`/api/admin/cleaners/${id}/availability`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newSlot),
    });
    if ((await res.json()).success) load(); else toast.error("Failed to add slot");
  }
  async function removeSlot(slotId: string) {
    await fetch(`/api/admin/cleaners/${id}/availability?slotId=${slotId}`, { method: "DELETE" });
    load();
  }
  async function addArea() {
    if (!newArea.trim()) return;
    const res = await fetch(`/api/admin/cleaners/${id}/coverage`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ postcodePrefix: newArea }),
    });
    if ((await res.json()).success) { setNewArea(""); load(); } else toast.error("Failed to add area");
  }
  async function removeArea(areaId: string) {
    await fetch(`/api/admin/cleaners/${id}/coverage?areaId=${areaId}`, { method: "DELETE" });
    load();
  }

  if (loading || !cleaner) return <div className="flex h-96 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-brand-teal-600" /></div>;

  return (
    <div className="p-6 sm:p-8">
      <h1 className="font-display text-2xl font-extrabold text-slate-900">{cleaner.full_name}</h1>
      <p className="mt-1 text-sm text-slate-500">{cleaner.email} · {cleaner.phone}</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-900">DBS check</h2>
            <button onClick={toggleDbs} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold ${cleaner.dbs_verified ? "bg-brand-teal-100 text-brand-teal-800" : "bg-amber-100 text-amber-800"}`}>
              <ShieldCheck className="h-4 w-4" /> {cleaner.dbs_verified ? "Verified" : "Mark verified"}
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-400">Document upload lands in Phase 2 polish — this toggle records the check manually for now.</p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-bold text-slate-900">Upcoming jobs</h2>
          <div className="mt-2 space-y-2">
            {upcomingJobs.map((j) => (
              <div key={j.id} className="flex justify-between text-sm">
                <span className="text-slate-700">{j.reference}</span>
                <span className="text-slate-400">{j.clean_date ? new Date(j.clean_date).toLocaleDateString("en-GB") : "Flexible"}</span>
              </div>
            ))}
            {upcomingJobs.length === 0 && <p className="text-sm text-slate-400">No upcoming jobs assigned.</p>}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-bold text-slate-900">Availability</h2>
          <div className="mt-2 space-y-1.5">
            {availability.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5 text-sm">
                <span>{DAYS[s.day_of_week]} {s.start_time}–{s.end_time}</span>
                <button onClick={() => removeSlot(s.id)}><Trash2 className="h-3.5 w-3.5 text-red-500" /></button>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <select value={newSlot.dayOfWeek} onChange={(e) => setNewSlot((s) => ({ ...s, dayOfWeek: Number(e.target.value) }))} className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm">
              {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
            </select>
            <input type="time" value={newSlot.startTime} onChange={(e) => setNewSlot((s) => ({ ...s, startTime: e.target.value }))} className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm" />
            <input type="time" value={newSlot.endTime} onChange={(e) => setNewSlot((s) => ({ ...s, endTime: e.target.value }))} className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm" />
            <button onClick={addSlot} className="flex items-center gap-1 rounded-lg bg-brand-teal-700 px-3 py-1.5 text-sm font-semibold text-white"><Plus className="h-3.5 w-3.5" /> Add</button>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-bold text-slate-900">Coverage areas</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {coverage.map((a) => (
              <span key={a.id} className="flex items-center gap-1.5 rounded-full bg-brand-sky-100 px-3 py-1 text-sm font-semibold text-brand-sky-700">
                {a.postcode_prefix}
                <button onClick={() => removeArea(a.id)}><Trash2 className="h-3 w-3" /></button>
              </span>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <input value={newArea} onChange={(e) => setNewArea(e.target.value)} placeholder="e.g. SW1" className="w-32 rounded-lg border border-slate-200 px-2 py-1.5 text-sm" />
            <button onClick={addArea} className="flex items-center gap-1 rounded-lg bg-brand-teal-700 px-3 py-1.5 text-sm font-semibold text-white"><Plus className="h-3.5 w-3.5" /> Add</button>
          </div>
        </section>
      </div>
    </div>
  );
}
