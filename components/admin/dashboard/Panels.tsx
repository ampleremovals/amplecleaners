import Link from "next/link";
import {
  AlertTriangle, BarChart3, CalendarPlus, CheckCircle2, ChevronRight, Inbox, Landmark, Receipt, Settings, ShieldCheck, Sparkles, UserPlus, UserRound, UserX, Zap,
} from "lucide-react";
import { Avatar, Panel, PanelHeader, StatusBadge } from "@/components/admin/ui";
import type { Overview } from "@/lib/admin/overview";
import { timeAgo, type TeamState } from "@/lib/admin/overview-shared";
import { formatCurrency } from "@/lib/utils";
import { SERVICE_LABELS, type BookingStatus, type ServiceType } from "@/types";
import { stageOf } from "@/lib/pipeline";

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);
const LinkAll = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <Link href={href} className="text-xs font-semibold text-brand-green-700 hover:underline">{children}</Link>
);

/* ── Pipeline ──────────────────────────────────────────────────────────── */

const STAGE_COLOR: Record<string, { bar: string; dot: string }> = {
  new: { bar: "bg-slate-300", dot: "bg-slate-400" },
  quoted: { bar: "bg-sky-400", dot: "bg-sky-500" },
  confirmed: { bar: "bg-emerald-400", dot: "bg-emerald-500" },
  in_progress: { bar: "bg-amber-400", dot: "bg-amber-500" },
  completed: { bar: "bg-slate-700", dot: "bg-slate-800" },
};

export function Pipeline({ stages }: { stages: Overview["pipeline"] }) {
  const total = stages.reduce((s, x) => s + x.count, 0);
  const max = Math.max(...stages.map((s) => s.count), 1);
  return (
    <Panel>
      <PanelHeader title="Pipeline" hint={`${total} active booking${total === 1 ? "" : "s"}`} right={<LinkAll href="/admin/bookings">Open board</LinkAll>} />
      <ul className="flex flex-1 flex-col justify-around gap-3.5 p-5">
        {stages.map((s) => (
          <li key={s.key}>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 font-medium text-slate-700"><span className={`h-2 w-2 rounded-full ${STAGE_COLOR[s.key].dot}`} aria-hidden />{s.title}</span>
              <span className="font-semibold tabular-nums text-slate-900">{s.count}</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className={`h-full rounded-full ${STAGE_COLOR[s.key].bar} transition-[width] duration-700`} style={{ width: `${s.count === 0 ? 0 : Math.max((s.count / max) * 100, 4)}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

/* ── Next 7 days ───────────────────────────────────────────────────────── */

export function WeekLoad({ days }: { days: Overview["weekLoad"] }) {
  const total = days.reduce((s, d) => s + d.count, 0);
  const max = Math.max(...days.map((d) => d.count), 1);
  return (
    <Panel>
      <PanelHeader title="Next 7 days" hint={`${total} job${total === 1 ? "" : "s"} scheduled`} right={<LinkAll href="/admin/bookings">Schedule</LinkAll>} />
      <div className="flex flex-1 flex-col px-5 pb-5 pt-6">
        <div className="relative min-h-[9rem] flex-1">
          <div className="absolute inset-0 flex items-end gap-2">
            {days.map((d, i) => {
              const date = new Date(`${d.day}T00:00:00Z`);
              return (
                <div key={d.day} className="group flex h-full flex-1 flex-col items-center justify-end gap-1.5" title={`${date.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })}: ${d.count} job${d.count === 1 ? "" : "s"}`}>
                  <span className={`text-xs font-semibold tabular-nums ${d.count ? "text-slate-900" : "text-slate-300"}`}>{d.count}</span>
                  <div className={`w-full rounded-t-lg transition-colors ${i === 0 ? "bg-brand-green-700" : d.count ? "bg-brand-green-300 group-hover:bg-brand-green-500" : "bg-slate-100"}`} style={{ height: d.count ? `${Math.max((d.count / max) * 80, 10)}%` : "4px" }} />
                </div>
              );
            })}
          </div>
        </div>
        <div className="mt-2 flex gap-2 text-center text-[11px] text-slate-500">
          {days.map((d, i) => {
            const date = new Date(`${d.day}T00:00:00Z`);
            return (
              <div key={d.day} className={`flex-1 ${i === 0 ? "font-semibold text-slate-900" : ""}`}>
                {i === 0 ? "Today" : date.toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" })}
                <span className="block text-slate-400">{date.getUTCDate()}</span>
              </div>
            );
          })}
        </div>
      </div>
    </Panel>
  );
}

/* ── Team today ────────────────────────────────────────────────────────── */

const STATE_DOT: Record<TeamState, string> = { on_job: "bg-amber-500", booked: "bg-sky-500", available: "bg-emerald-500" };

export function TeamToday({ team }: { team: Overview["team"] }) {
  const on = team.filter((t) => t.state === "on_job").length;
  const booked = team.filter((t) => t.state === "booked").length;
  const free = team.filter((t) => t.state === "available").length;
  const shown = team.slice(0, 5);
  return (
    <Panel>
      <PanelHeader title="Team today" hint={team.length ? `${on} on a job · ${booked} booked · ${free} free` : "No active cleaners yet"} right={<LinkAll href="/admin/cleaners">Roster</LinkAll>} />
      {team.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-slate-500">Add a cleaner to see who is working today.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {shown.map((m) => (
            <li key={m.id}>
              <Link href={`/admin/cleaners/${m.id}`} className="flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-slate-50">
                <span className="relative"><Avatar name={m.name} size={32} /><span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-white ${STATE_DOT[m.state]}`} aria-hidden /></span>
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-slate-900">{m.name}</span><span className="block truncate text-xs text-slate-500">{m.detail}</span></span>
              </Link>
            </li>
          ))}
          {team.length > shown.length && <li className="px-5 py-2.5 text-xs text-slate-500">+ {team.length - shown.length} more on the <Link href="/admin/cleaners" className="font-semibold text-brand-green-700 hover:underline">roster</Link></li>}
        </ul>
      )}
    </Panel>
  );
}

/* ── Today's timeline ──────────────────────────────────────────────────── */

const TIMELINE_DOT: Record<string, string> = { new: "bg-slate-400", quoted: "bg-sky-500", confirmed: "bg-emerald-500", in_progress: "bg-amber-500", completed: "bg-emerald-500", lost: "bg-red-500" };

export function TodayTimeline({ jobs }: { jobs: Overview["todayJobs"] }) {
  return (
    <Panel>
      <PanelHeader title="Today's schedule" hint={`${jobs.length} job${jobs.length === 1 ? "" : "s"}`} right={<LinkAll href="/admin/bookings">All bookings</LinkAll>} />
      {jobs.length === 0 ? (
        <div className="flex flex-col items-center px-5 py-10 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400"><CalendarPlus className="h-5 w-5" /></span>
          <p className="mt-3 text-sm font-medium text-slate-700">Nothing scheduled today</p>
          <p className="mt-1 text-xs text-slate-500">Jobs appear here the moment a booking is dated for today.</p>
        </div>
      ) : (
        <ol className="relative px-5 py-4">
          <span className="absolute bottom-6 left-[4.55rem] top-6 w-px bg-slate-200 sm:left-[5.05rem]" aria-hidden />
          {jobs.map((j) => (
            <li key={j.id} className="relative">
              <Link href={`/admin/bookings/${j.id}`} className="group flex items-start gap-3 rounded-xl py-2 pr-2 transition-colors hover:bg-slate-50 sm:gap-4">
                <span className="w-11 shrink-0 pt-1 text-right text-sm font-semibold tabular-nums text-slate-900 sm:w-12">{j.clean_time ? j.clean_time.slice(0, 5) : "TBC"}</span>
                <span className={`relative z-10 mt-2 h-3 w-3 shrink-0 rounded-full ring-4 ring-white ${TIMELINE_DOT[stageOf(j.status as BookingStatus)]}`} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                    <span className="truncate text-sm font-medium text-slate-900">{j.customer}</span>
                    <StatusBadge status={j.status as BookingStatus} />
                  </span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                    {SERVICE_LABELS[j.service_type as ServiceType]} <span aria-hidden>·</span>
                    {j.cleaner ? <span className="inline-flex items-center gap-1.5"><Avatar name={j.cleaner} size={16} />{j.cleaner}</span> : <span className="font-medium text-amber-700">Unassigned</span>}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}

/* ── Recent activity ───────────────────────────────────────────────────── */

/** A few activity entries are stored as codes rather than sentences; show them as the sentence a person would write. */
const ACTION_TEXT: Record<string, string> = {
  booking_created: "New booking received",
  deposit_claimed: "Customer says they've paid the deposit by bank transfer",
  instant_quote: "Instant quote sent to the customer",
};
const sentence = (action: string) => { const t = ACTION_TEXT[action] ?? action; return t.charAt(0).toUpperCase() + t.slice(1); };

const BY_ICON = { system: Zap, customer: UserRound, cleaner: Sparkles, admin: ShieldCheck } as const;
const BY_TINT = { system: "bg-violet-50 text-violet-600", customer: "bg-sky-50 text-sky-600", cleaner: "bg-emerald-50 text-emerald-600", admin: "bg-slate-100 text-slate-600" } as const;

export function ActivityFeed({ items }: { items: Overview["activity"] }) {
  return (
    <Panel>
      <PanelHeader title="Recent activity" hint="Everything the system and your team just did" />
      {items.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-slate-500">Activity from bookings, cleaners and automation will appear here.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.map((a) => {
            const key = (a.by in BY_ICON ? a.by : "system") as keyof typeof BY_ICON;
            const Icon = BY_ICON[key];
            return (
              <li key={a.id} className="flex items-start gap-3 px-5 py-3">
                <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${BY_TINT[key]}`}><Icon className="h-4 w-4" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm leading-snug text-slate-800">{sentence(a.action)}</span>
                  <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                    {a.reference && a.bookingId && <Link href={`/admin/bookings/${a.bookingId}`} className="rounded-md bg-slate-100 px-1.5 py-0.5 font-medium text-slate-700 hover:bg-slate-200">{a.reference}</Link>}
                    {a.customer && <span>{a.customer}</span>}
                    <span aria-hidden>·</span><span>{timeAgo(a.at)}</span>
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

/* ── Needs attention ───────────────────────────────────────────────────── */

type Severity = "info" | "warning" | "critical";
const DOT: Record<Severity, string> = { info: "bg-sky-500", warning: "bg-amber-500", critical: "bg-red-500" };

function AttentionRow({ href, icon: Icon, severity, title, hint }: { href: string; icon: typeof Inbox; severity: Severity; title: string; hint: string }) {
  return (
    <li>
      <Link href={href} className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-slate-50">
        <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
          <Icon className="h-4 w-4" />
          <span className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-white ${DOT[severity]}`} aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-slate-900">{title}</span>
          <span className="block truncate text-xs text-slate-500">{hint}</span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition-colors group-hover:text-slate-500" />
      </Link>
    </li>
  );
}

export function Attention({ a }: { a: Overview["attention"] }) {
  const rows: React.ReactNode[] = [];
  if (a.enquiries) rows.push(<AttentionRow key="enq" href="/admin/bookings" icon={Inbox} severity="info" title={`${a.enquiries} new ${plural(a.enquiries, "enquiry", "enquiries")}`} hint="Build and send a quote" />);
  if (a.applications) rows.push(<AttentionRow key="app" href="/admin/applications" icon={UserPlus} severity="info" title={`${a.applications} cleaner ${plural(a.applications, "application", "applications")} to review`} hint="Approve or decline" />);
  if (a.claimed) rows.push(<AttentionRow key="dep" href="/admin/bookings" icon={Landmark} severity="warning" title={`${a.claimed} ${plural(a.claimed, "deposit", "deposits")} to verify`} hint="Customer says they've paid by bank transfer" />);
  if (a.unassigned) rows.push(<AttentionRow key="una" href="/admin/bookings" icon={UserX} severity="warning" title={`${a.unassigned} confirmed ${plural(a.unassigned, "job", "jobs")} without a cleaner`} hint="Open it and press Auto-assign" />);
  if (a.overdueCount) rows.push(<AttentionRow key="od" href="/admin/invoices" icon={Receipt} severity="critical" title={`${a.overdueCount} overdue ${plural(a.overdueCount, "invoice", "invoices")}`} hint={`${formatCurrency(a.overdueTotal)} outstanding`} />);
  for (const b of a.flagged) rows.push(<AttentionRow key={b.id} href={`/admin/bookings/${b.id}`} icon={AlertTriangle} severity="critical" title={`${b.reference} needs attention`} hint={b.flag_reason ?? "Flagged"} />);
  return (
    <Panel>
      <PanelHeader title="Needs your attention" right={rows.length > 0 ? <span className="rounded-full bg-slate-900 px-2 py-0.5 text-xs font-semibold text-white">{rows.length}</span> : undefined} />
      {rows.length ? <ul className="divide-y divide-slate-100">{rows}</ul> : (
        <div className="flex items-center gap-3 px-5 py-6 text-sm text-slate-600"><CheckCircle2 className="h-5 w-5 text-emerald-600" /> All clear. Nothing is waiting on you.</div>
      )}
    </Panel>
  );
}

/* ── Quick actions ─────────────────────────────────────────────────────── */

const ACTIONS = [
  { href: "/admin/bookings/new", label: "New booking", hint: "Phone or walk-in", icon: CalendarPlus, tint: "bg-emerald-50 text-emerald-700" },
  { href: "/admin/cleaners", label: "Add a cleaner", hint: "Roster & documents", icon: UserPlus, tint: "bg-sky-50 text-sky-700" },
  { href: "/admin/applications", label: "Applications", hint: "Review new cleaners", icon: UserRound, tint: "bg-violet-50 text-violet-700" },
  { href: "/admin/invoices", label: "Invoices", hint: "Send, mark paid", icon: Receipt, tint: "bg-amber-50 text-amber-700" },
  { href: "/admin/reports", label: "Reports", hint: "Marketing & revenue", icon: BarChart3, tint: "bg-rose-50 text-rose-700" },
  { href: "/admin/settings", label: "Settings", hint: "Prices & messaging", icon: Settings, tint: "bg-slate-100 text-slate-700" },
];

export function QuickActions() {
  return (
    <Panel>
      <PanelHeader title="Quick actions" hint={<>Press <kbd className="rounded border border-slate-200 bg-slate-50 px-1 font-sans text-[10px] font-semibold text-slate-600">Ctrl</kbd> <kbd className="rounded border border-slate-200 bg-slate-50 px-1 font-sans text-[10px] font-semibold text-slate-600">K</kbd> to search anything</>} />
      <div className="grid grid-cols-2 gap-3 p-4">
        {ACTIONS.map((a) => (
          <Link key={a.href} href={a.href} className="group rounded-xl border border-slate-200 p-3.5 transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
            <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${a.tint}`}><a.icon className="h-[18px] w-[18px]" /></span>
            <span className="mt-3 block text-sm font-semibold text-slate-900">{a.label}</span>
            <span className="block text-xs text-slate-500">{a.hint}</span>
          </Link>
        ))}
      </div>
    </Panel>
  );
}
