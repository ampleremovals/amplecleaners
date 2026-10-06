"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Briefcase, Inbox, PoundSterling, Users } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CountUp } from "@/components/admin/dashboard/motion";
import { Sparkline } from "@/components/admin/dashboard/Sparkline";
import { RANGE_DAYS, type RangeDays, type RevenueRange } from "@/lib/admin/overview-shared";
import { formatCurrency } from "@/lib/utils";

export interface SummaryChip { label: string; href: string; tone: "info" | "warning" | "critical" }

interface Props {
  greeting: string;
  name: string | null;
  dateLabel: string;
  chips: SummaryChip[];
  ranges: Record<RangeDays, RevenueRange>;
  thisMonth: number;
  bookingsSeries: number[];
  bookingsTotal: number;
  outstanding: { total: number; count: number; overdueTotal: number; overdueCount: number };
  jobsToday: number;
  inProgress: number;
  cleaners: number;
  unassigned: number;
}

const shortDay = (ymd: string) => new Date(`${ymd}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const money = (n: number) => formatCurrency(Math.round(n * 100) / 100);
const CHIP_DOT = { info: "bg-sky-400", warning: "bg-amber-400", critical: "bg-red-400" } as const;

function Delta({ now, before, days }: { now: number; before: number; days: number }) {
  if (before <= 0) {
    return <span className="text-[13px] text-white/60">{now > 0 ? "Nothing to compare against yet" : "No payments in this period"}</span>;
  }
  const pct = Math.round(((now - before) / before) * 100);
  const up = pct >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className="flex items-center gap-2 text-[13px] text-white/70">
      <span className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-semibold ${up ? "bg-emerald-400/15 text-emerald-300" : "bg-red-400/15 text-red-300"}`}>
        <Icon className="h-3.5 w-3.5" />{Math.abs(pct)}%
      </span>
      vs the previous {days} days
    </span>
  );
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: { day: string; amount: number } }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-xl border border-white/15 bg-brand-green-950/90 px-3 py-2 text-white shadow-2xl backdrop-blur">
      <p className="text-[11px] text-white/60">{shortDay(p.day)}</p>
      <p className="text-sm font-semibold tabular-nums">{money(p.amount)}</p>
    </div>
  );
}

function Tile({ icon: Icon, label, value, foot, spark }: { icon: typeof Users; label: string; value: React.ReactNode; foot: React.ReactNode; spark?: number[] }) {
  return (
    <div className="relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-sm transition-colors hover:bg-white/[0.09]">
      <div className="flex items-center justify-between text-white/60">
        <p className="text-[12.5px] font-medium">{label}</p>
        <Icon className="h-4 w-4" />
      </div>
      <p className="mt-2 text-[1.55rem] font-semibold leading-none tracking-tight text-white tabular-nums">{value}</p>
      <p className="mt-2 text-xs text-white/60">{foot}</p>
      {spark && <Sparkline values={spark} height={30} className="pointer-events-none absolute inset-x-0 bottom-0 w-full opacity-80" />}
    </div>
  );
}

export function RevenueHero(p: Props) {
  const [range, setRange] = useState<RangeDays>(14);
  const r = p.ranges[range];
  const max = useMemo(() => Math.max(...r.series.map((d) => d.amount), 0), [r]);
  const empty = max === 0;
  const data = useMemo(() => r.series.map((d) => ({ ...d, label: shortDay(d.day) })), [r]);

  return (
    <section className="relative overflow-hidden rounded-[1.75rem] bg-brand-green-950 text-white shadow-[0_30px_80px_-30px_rgba(5,46,22,0.7)]">
      {/* depth: brand glows + a faint dot grid */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -left-32 -top-40 h-[34rem] w-[34rem] rounded-full bg-brand-green-500/25 blur-[110px]" />
        <div className="absolute -right-24 top-0 h-[28rem] w-[28rem] rounded-full bg-brand-sky-500/20 blur-[110px]" />
        <div className="absolute -bottom-48 left-1/3 h-[26rem] w-[26rem] rounded-full bg-brand-violet-500/20 blur-[120px]" />
        <div
          className="absolute inset-0 opacity-60"
          style={{
            backgroundImage: "radial-gradient(rgba(255,255,255,0.13) 1px, transparent 1px)",
            backgroundSize: "26px 26px",
            maskImage: "linear-gradient(to bottom, black 0%, transparent 80%)",
            WebkitMaskImage: "linear-gradient(to bottom, black 0%, transparent 80%)",
          }}
        />
      </div>

      <div className="relative grid gap-8 p-5 sm:p-8 xl:grid-cols-[minmax(0,1fr)_340px]">
        {/* ── left: greeting, live summary, revenue ── */}
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-brand-green-200">{p.dateLabel}</p>
          <h1 className="mt-1 text-balance text-[1.75rem] font-semibold leading-tight tracking-tight sm:text-[2.1rem]">
            {p.greeting}{p.name ? `, ${p.name}` : ""}
          </h1>

          <div className="mt-4 flex flex-wrap gap-2" aria-label="What needs you right now">
            {p.chips.length === 0 ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-[13px] font-medium text-white">
                <span className="h-2 w-2 rounded-full bg-emerald-400" aria-hidden />All clear. Nothing is waiting on you.
              </span>
            ) : p.chips.map((c) => (
              <Link key={c.label} href={c.href} className="group inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-white/20">
                <span className={`h-2 w-2 rounded-full ${CHIP_DOT[c.tone]}`} aria-hidden />{c.label}
                <ArrowUpRight className="h-3.5 w-3.5 text-white/50 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white" aria-hidden />
              </Link>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
            <div>
              <p className="text-[13px] font-medium text-white/60">Revenue received · last {range} days</p>
              <p className="mt-1 text-[2.6rem] font-semibold leading-none tracking-tight tabular-nums sm:text-[3.4rem]">
                <CountUp value={r.total} format={money} />
              </p>
              <div className="mt-3"><Delta now={r.total} before={r.previousTotal} days={range} /></div>
            </div>
            <div className="inline-flex rounded-xl border border-white/10 bg-white/[0.07] p-1" role="group" aria-label="Chart range">
              {RANGE_DAYS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setRange(d)}
                  aria-pressed={range === d}
                  className={`rounded-lg px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${range === d ? "bg-white text-brand-green-950 shadow" : "text-white/70 hover:text-white"}`}
                >
                  {d}D
                </button>
              ))}
            </div>
          </div>

          <div className="relative mt-6 h-48 sm:h-56">
            <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 720, height: 240 }}>
              <AreaChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
                <defs>
                  <linearGradient id="revFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#4ade80" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#4ade80" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={28} tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 11 }} />
                <YAxis hide domain={[0, empty ? 100 : Math.ceil((max * 1.2) / 10) * 10]} />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: "rgba(255,255,255,0.25)", strokeDasharray: "3 3" }} />
                <Area type="monotone" dataKey="amount" stroke="#4ade80" strokeWidth={2.5} fill="url(#revFill)" activeDot={{ r: 5, fill: "#fff", stroke: "#4ade80", strokeWidth: 2 }} animationDuration={900} />
              </AreaChart>
            </ResponsiveContainer>
            {empty && <p className="pointer-events-none absolute inset-x-0 top-1/3 text-center text-sm text-white/60">No payments received in this period.</p>}
          </div>
          <p className="mt-2 text-[13px] text-white/60">{money(p.thisMonth)} received so far this month</p>
        </div>

        {/* ── right: live tiles ── */}
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-1 xl:grid-rows-4 xl:gap-4">
          <Tile icon={PoundSterling} label="Outstanding" value={<CountUp value={p.outstanding.total} format={money} />}
            foot={p.outstanding.overdueCount > 0 ? <span className="font-medium text-red-300">{money(p.outstanding.overdueTotal)} overdue</span> : p.outstanding.count === 0 ? "Nothing unpaid" : `${p.outstanding.count} unpaid, none overdue`} />
          <Tile icon={Inbox} label="Bookings, 14 days" value={<CountUp value={p.bookingsTotal} format={(n) => String(Math.round(n))} />}
            foot="received" spark={p.bookingsSeries} />
          <Tile icon={Briefcase} label="Jobs today" value={<CountUp value={p.jobsToday} format={(n) => String(Math.round(n))} />}
            foot={`${p.inProgress} in progress now`} />
          <Tile icon={Users} label="Active cleaners" value={<CountUp value={p.cleaners} format={(n) => String(Math.round(n))} />}
            foot={p.unassigned > 0 ? <span className="font-medium text-amber-300">{p.unassigned} job{p.unassigned === 1 ? "" : "s"} unassigned</span> : "All jobs covered"} />
        </div>
      </div>
    </section>
  );
}
