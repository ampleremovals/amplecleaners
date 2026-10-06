"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, ShieldCheck, FileText, Upload, ExternalLink } from "lucide-react";
import { ErrorState } from "@/components/admin/DataState";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface Cleaner { id: string; full_name: string; email: string; phone: string; is_active: boolean; dbs_verified: boolean; pay_rate_per_hour: number | null; dbs_check_url: string | null; right_to_work_url: string | null; }
interface Slot { id: string; day_of_week: number; start_time: string; end_time: string; }
interface Area { id: string; postcode_prefix: string; }
interface Job { id: string; reference: string; clean_date: string | null; status: string; }
interface TimeOff { id: string; start_date: string; end_date: string; reason: string | null; }

export default function CleanerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [cleaner, setCleaner] = useState<Cleaner | null>(null);
  const [availability, setAvailability] = useState<Slot[]>([]);
  const [coverage, setCoverage] = useState<Area[]>([]);
  const [upcomingJobs, setUpcomingJobs] = useState<Job[]>([]);
  const [timeOff, setTimeOff] = useState<TimeOff[]>([]);
  const [declines30d, setDeclines30d] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [payRate, setPayRate] = useState("");
  const [uploading, setUploading] = useState<string | null>(null);
  const [newSlot, setNewSlot] = useState({ dayOfWeek: 1, startTime: "09:00", endTime: "17:00" });
  const [newArea, setNewArea] = useState("");

  const load = useCallback(async () => {
    let res;
    try {
      res = await fetch(`/api/admin/cleaners/${id}`).then((r) => r.json());
    } catch {
      setLoadError("Network error — check your connection.");
      setLoading(false);
      return;
    }
    if (!res.success) setLoadError(res.error ?? "Couldn't load this cleaner.");
    if (res.success) {
      setLoadError(null);
      setCleaner(res.cleaner);
      setPayRate(res.cleaner.pay_rate_per_hour == null ? "" : String(res.cleaner.pay_rate_per_hour));
      setAvailability(res.availability);
      setCoverage(res.coverage);
      setUpcomingJobs(res.upcomingJobs);
      setTimeOff(res.timeOff ?? []);
      setDeclines30d(res.declines30d ?? 0);
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

  async function savePayRate() {
    const value = payRate.trim() === "" ? null : Number(payRate);
    if (value !== null && (!Number.isFinite(value) || value < 0 || value > 200)) { toast.error("Enter an hourly rate between £0 and £200"); return; }
    const res = await fetch(`/api/admin/cleaners/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pay_rate_per_hour: value }) });
    if ((await res.json()).success) { toast.success("Pay rate saved"); load(); } else toast.error("Couldn't save the pay rate");
  }

  async function uploadDoc(kind: "dbs" | "right_to_work", file: File | undefined) {
    if (!file) return;
    setUploading(kind);
    try {
      const form = new FormData();
      form.append("kind", kind);
      form.append("file", file);
      const json = await fetch(`/api/admin/cleaners/${id}/documents`, { method: "POST", body: form }).then((r) => r.json());
      if (!json.success) throw new Error(json.error);
      toast.success("Document uploaded");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(null);
    }
  }

  async function viewDoc(kind: "dbs" | "right_to_work") {
    const json = await fetch(`/api/admin/cleaners/${id}/documents?kind=${kind}`).then((r) => r.json());
    if (json.success) window.open(json.url, "_blank", "noopener"); else toast.error(json.error ?? "Couldn't open the document");
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

  if (loadError && !cleaner) return <div className="p-4 sm:p-8"><ErrorState message={loadError} onRetry={() => { setLoading(true); load(); }} /></div>;
  if (loading || !cleaner) return <div className="flex h-96 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-brand-green-600" /></div>;

  return (
    <div className="p-4 sm:p-8">
      <h1 className="text-[1.65rem] font-semibold leading-tight text-slate-900">{cleaner.full_name}</h1>
      <p className="mt-1 text-sm text-slate-500">{cleaner.email} · {cleaner.phone}</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-900">DBS check</h2>
            <button onClick={toggleDbs} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold ${cleaner.dbs_verified ? "bg-brand-green-100 text-brand-green-800" : "bg-amber-100 text-amber-800"}`}>
              <ShieldCheck className="h-4 w-4" /> {cleaner.dbs_verified ? "Verified" : "Mark verified"}
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-400">Only DBS-verified cleaners are auto-assigned to jobs. Upload the certificate as evidence, then mark verified.</p>
          <div className="mt-4 space-y-3">
            {([["dbs", "DBS certificate", cleaner.dbs_check_url], ["right_to_work", "Right to work", cleaner.right_to_work_url]] as const).map(([kind, label, path]) => (
              <div key={kind} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2.5">
                <span className="flex items-center gap-2 text-sm font-semibold text-slate-700"><FileText className="h-4 w-4 text-slate-400" /> {label}</span>
                <span className="flex items-center gap-2">
                  {path && <button onClick={() => viewDoc(kind)} className="flex items-center gap-1 text-sm font-semibold text-brand-green-700 hover:underline"><ExternalLink className="h-3.5 w-3.5" /> View</button>}
                  <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">
                    {uploading === kind ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} {path ? "Replace" : "Upload"}
                    <input type="file" accept="application/pdf,image/jpeg,image/png" className="sr-only" disabled={uploading !== null} onChange={(e) => { uploadDoc(kind, e.target.files?.[0]); e.target.value = ""; }} />
                  </label>
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-bold text-slate-900">Pay rate</h2>
          <p className="mt-1 text-xs text-slate-400">Used for the cleaner&apos;s Earnings screen (clocked hours × rate).</p>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-sm text-slate-500">£</span>
            <input type="number" min={0} max={200} step={0.25} value={payRate} onChange={(e) => setPayRate(e.target.value)} placeholder="0.00" aria-label="Hourly pay rate" className="w-28 rounded-lg border border-slate-200 px-2 py-1.5 text-sm" />
            <span className="text-sm text-slate-500">/ hour</span>
            <button onClick={savePayRate} className="rounded-lg bg-brand-green-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-green-800">Save</button>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5">
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

        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-bold text-slate-900">Time off &amp; reliability</h2>
          <p className={`mt-2 text-sm ${declines30d >= 3 ? "font-semibold text-amber-700" : "text-slate-600"}`}>Jobs declined in the last 30 days: <strong>{declines30d}</strong>{declines30d >= 3 ? " — worth a chat" : ""}</p>
          <div className="mt-3 space-y-1.5">
            {timeOff.map((t) => (
              <div key={t.id} className="flex justify-between rounded-lg bg-slate-50 px-3 py-1.5 text-sm">
                <span>{new Date(t.start_date).toLocaleDateString("en-GB")} – {new Date(t.end_date).toLocaleDateString("en-GB")}</span>
                <span className="text-slate-400">{t.reason ?? ""}</span>
              </div>
            ))}
            {timeOff.length === 0 && <p className="text-sm text-slate-400">No time off booked.</p>}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-bold text-slate-900">Availability</h2>
          <div className="mt-2 space-y-1.5">
            {availability.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5 text-sm">
                <span>{DAYS[s.day_of_week]} {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}</span>
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
            <button onClick={addSlot} className="flex items-center gap-1 rounded-lg bg-brand-green-700 px-3 py-1.5 text-sm font-semibold text-white"><Plus className="h-3.5 w-3.5" /> Add</button>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5">
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
            <button onClick={addArea} className="flex items-center gap-1 rounded-lg bg-brand-green-700 px-3 py-1.5 text-sm font-semibold text-white"><Plus className="h-3.5 w-3.5" /> Add</button>
          </div>
        </section>
      </div>
    </div>
  );
}
