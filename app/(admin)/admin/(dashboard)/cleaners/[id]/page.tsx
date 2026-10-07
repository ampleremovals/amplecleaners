"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, ShieldCheck, ShieldAlert, FileText, Upload, ExternalLink } from "lucide-react";
import { ErrorState } from "@/components/admin/DataState";
import { AdminHero, AdminPage, BTN, HERO_BTN, INPUT } from "@/components/admin/kit";
import { Panel, PanelHeader, Pill } from "@/components/admin/ui";
import { cn } from "@/lib/utils";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface Cleaner { id: string; full_name: string; email: string; phone: string; is_active: boolean; dbs_verified: boolean; pay_rate_per_hour: number | null; dbs_check_url: string | null; right_to_work_url: string | null; }
interface Slot { id: string; day_of_week: number; start_time: string; end_time: string; }
interface Area { id: string; postcode_prefix: string; }
interface Job { id: string; reference: string; clean_date: string | null; status: string; }
interface TimeOff { id: string; start_date: string; end_date: string; reason: string | null; }

const ukDate = (d: string) => new Date(d).toLocaleDateString("en-GB");

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

  if (loadError && !cleaner) return <AdminPage><ErrorState message={loadError} onRetry={() => { setLoading(true); load(); }} /></AdminPage>;
  if (loading || !cleaner) return <div className="flex h-96 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-brand-green-600" /></div>;

  return (
    <AdminPage>
      <AdminHero
        back={{ href: "/admin/cleaners", label: "Cleaners" }}
        title={cleaner.full_name}
        description={`${cleaner.email} · ${cleaner.phone}`}
        actions={
          <button onClick={toggleDbs} className={cleaner.dbs_verified ? HERO_BTN.ghost : HERO_BTN.primary}>
            {cleaner.dbs_verified ? <ShieldCheck className="h-4 w-4 text-emerald-300" /> : <ShieldAlert className="h-4 w-4" />}
            {cleaner.dbs_verified ? "DBS verified" : "Mark DBS verified"}
          </button>
        }
        stats={[
          { label: "Status", value: cleaner.is_active ? "Active" : "Inactive" },
          { label: "Pay rate", value: cleaner.pay_rate_per_hour != null ? `£${cleaner.pay_rate_per_hour}/hr` : "—" },
          { label: "Upcoming jobs", value: upcomingJobs.length },
          { label: "Declined, 30 days", value: declines30d, hint: declines30d >= 3 ? "Worth a chat" : "Reliable", tone: declines30d >= 3 ? "warning" : "default" },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel>
          <PanelHeader title="DBS & documents" hint="Only DBS-verified cleaners are auto-assigned to jobs. Upload the certificate as evidence, then mark verified." right={<Pill tone={cleaner.dbs_verified ? "positive" : "warning"}>{cleaner.dbs_verified ? "Verified" : "Pending"}</Pill>} />
          <div className="space-y-3 p-5">
            {([["dbs", "DBS certificate", cleaner.dbs_check_url], ["right_to_work", "Right to work", cleaner.right_to_work_url]] as const).map(([kind, label, path]) => (
              <div key={kind} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-4 py-3">
                <span className="flex items-center gap-2.5 text-sm font-medium text-slate-800"><FileText className="h-4 w-4 text-slate-400" /> {label}</span>
                <span className="flex items-center gap-3">
                  {path && <button onClick={() => viewDoc(kind)} className="inline-flex items-center gap-1 text-[13px] font-semibold text-brand-green-700 hover:underline"><ExternalLink className="h-3.5 w-3.5" /> View</button>}
                  <label className={`${BTN.secondary} h-9 cursor-pointer`}>
                    {uploading === kind ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} {path ? "Replace" : "Upload"}
                    <input type="file" accept="application/pdf,image/jpeg,image/png" className="sr-only" disabled={uploading !== null} onChange={(e) => { uploadDoc(kind, e.target.files?.[0]); e.target.value = ""; }} />
                  </label>
                </span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Pay rate" hint="Used for the cleaner's Earnings screen (clocked hours × rate)." />
          <div className="flex flex-wrap items-center gap-3 p-5">
            <span className="text-sm text-slate-500">£</span>
            <input type="number" min={0} max={200} step={0.25} value={payRate} onChange={(e) => setPayRate(e.target.value)} placeholder="0.00" aria-label="Hourly pay rate" className={cn(INPUT, "w-28")} />
            <span className="text-sm text-slate-500">per hour</span>
            <button onClick={savePayRate} className={BTN.primary}>Save</button>
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Upcoming jobs" hint={`${upcomingJobs.length} assigned`} />
          {upcomingJobs.length === 0 ? <p className="px-5 py-8 text-center text-sm text-slate-500">No upcoming jobs assigned.</p> : (
            <ul className="divide-y divide-slate-100">
              {upcomingJobs.map((j) => (
                <li key={j.id} className="flex items-center justify-between px-5 py-3 text-sm">
                  <Link href={`/admin/bookings/${j.id}`} className="font-medium text-slate-900 hover:text-brand-green-700 hover:underline">{j.reference}</Link>
                  <span className="text-slate-500">{j.clean_date ? ukDate(j.clean_date) : "Flexible"}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel>
          <PanelHeader title="Time off & reliability" hint={`Jobs declined in the last 30 days: ${declines30d}${declines30d >= 3 ? " — worth a chat" : ""}`} />
          {timeOff.length === 0 ? <p className="px-5 py-8 text-center text-sm text-slate-500">No time off booked.</p> : (
            <ul className="divide-y divide-slate-100">
              {timeOff.map((t) => (
                <li key={t.id} className="flex items-center justify-between px-5 py-3 text-sm">
                  <span className="font-medium text-slate-900">{ukDate(t.start_date)} – {ukDate(t.end_date)}</span>
                  <span className="text-slate-500">{t.reason ?? ""}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel>
          <PanelHeader title="Availability" hint="When they can work each week." />
          <div className="p-5">
            {availability.length === 0 ? <p className="text-sm text-slate-500">No weekly availability set yet.</p> : (
              <ul className="space-y-2">
                {availability.map((s) => (
                  <li key={s.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2.5 text-sm">
                    <span className="font-medium text-slate-800">{DAYS[s.day_of_week]} <span className="font-normal text-slate-600">{s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}</span></span>
                    <button onClick={() => removeSlot(s.id)} aria-label={`Remove ${DAYS[s.day_of_week]} slot`} className="rounded-md p-1 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
              <select value={newSlot.dayOfWeek} onChange={(e) => setNewSlot((s) => ({ ...s, dayOfWeek: Number(e.target.value) }))} aria-label="Day" className={cn(INPUT, "w-24")}>
                {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
              </select>
              <input type="time" value={newSlot.startTime} onChange={(e) => setNewSlot((s) => ({ ...s, startTime: e.target.value }))} aria-label="Start time" className={cn(INPUT, "w-32")} />
              <input type="time" value={newSlot.endTime} onChange={(e) => setNewSlot((s) => ({ ...s, endTime: e.target.value }))} aria-label="End time" className={cn(INPUT, "w-32")} />
              <button onClick={addSlot} className={BTN.primary}><Plus className="h-4 w-4" /> Add</button>
            </div>
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Coverage areas" hint="Postcode areas they work in. Used to match them to jobs." />
          <div className="p-5">
            {coverage.length === 0 ? <p className="text-sm text-slate-500">No areas added yet, so they can&apos;t be auto-assigned.</p> : (
              <div className="flex flex-wrap gap-2">
                {coverage.map((a) => (
                  <span key={a.id} className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 py-1 pl-3 pr-2 text-sm font-semibold text-sky-800">
                    {a.postcode_prefix}
                    <button onClick={() => removeArea(a.id)} aria-label={`Remove ${a.postcode_prefix}`} className="rounded-full p-0.5 text-sky-500 transition-colors hover:bg-sky-100 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                  </span>
                ))}
              </div>
            )}
            <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4">
              <input value={newArea} onChange={(e) => setNewArea(e.target.value)} placeholder="e.g. RM8" aria-label="Postcode area" className={cn(INPUT, "w-36")} />
              <button onClick={addArea} className={BTN.primary}><Plus className="h-4 w-4" /> Add</button>
            </div>
          </div>
        </Panel>
      </div>
    </AdminPage>
  );
}
