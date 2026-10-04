/* eslint-disable @typescript-eslint/no-explicit-any -- untyped Supabase client */
import Link from "next/link";
import { AlertTriangle, UserPlus, Calendar, CheckCircle2, Clock, Landmark, PoundSterling, UserX, Users, Inbox, Receipt } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/server";
import { todayInLondon } from "@/lib/cleaner-auth";
import { ErrorState } from "@/components/admin/DataState";
import { formatCurrency, formatDate } from "@/lib/utils";
import { BOOKING_STATUS_LABELS, SERVICE_LABELS, type BookingStatus, type ServiceType } from "@/types";

export const dynamic = "force-dynamic";

const oneOf = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));

async function loadOverview() {
  const supabase: any = createAdminClient();
  const today = todayInLondon();
  const monthStart = `${today.slice(0, 7)}-01`;
  const count = (q: any) => q.then((r: any) => r.count ?? 0);

  const [total, cleaners, inProgress, paid, open, flagged, claimed, unassigned, enquiries, todays, applications] = await Promise.all([
    count(supabase.from("bookings").select("id", { count: "exact", head: true })),
    count(supabase.from("cleaners").select("id", { count: "exact", head: true }).eq("is_active", true)),
    count(supabase.from("bookings").select("id", { count: "exact", head: true }).eq("status", "in_progress")),
    supabase.from("invoices").select("total").eq("status", "paid").gte("paid_at", `${monthStart}T00:00:00Z`),
    supabase.from("invoices").select("total, due_date").eq("status", "sent").lt("due_date", today),
    supabase.from("bookings").select("id, reference, flag_reason").eq("is_flagged", true).limit(5),
    count(supabase.from("bookings").select("id", { count: "exact", head: true }).eq("deposit_status", "claimed").in("status", ["quote_sent", "deposit_invoice_sent"])),
    count(supabase.from("bookings").select("id", { count: "exact", head: true }).eq("status", "booking_confirmed").is("assigned_cleaner_id", null)),
    count(supabase.from("bookings").select("id", { count: "exact", head: true }).eq("status", "inquiry")),
    supabase.from("bookings").select("id, reference, service_type, status, clean_time, customer:customers(full_name), cleaner:cleaners(full_name)").eq("clean_date", today).not("status", "in", "(cancelled,bad_lead,not_a_good_fit)").order("clean_time"),
    count(supabase.from("cleaner_applications").select("id", { count: "exact", head: true }).eq("status", "new")),
  ]);

  return {
    stats: {
      total, cleaners, inProgress,
      revenue: (paid.data ?? []).reduce((s: number, i: any) => s + Number(i.total), 0),
    },
    attention: {
      flagged: flagged.data ?? [],
      claimed, unassigned, enquiries, applications,
      overdueCount: open.data?.length ?? 0,
      overdueTotal: (open.data ?? []).reduce((s: number, i: any) => s + Number(i.total), 0),
    },
    today: todays.data ?? [],
    todayLabel: formatDate(today),
  };
}

function AttentionItem({ href, icon: Icon, tone, title, hint }: { href: string; icon: typeof Inbox; tone: "amber" | "red" | "sky"; title: string; hint: string }) {
  const cls = { amber: "bg-amber-50 text-amber-700", red: "bg-red-50 text-red-700", sky: "bg-sky-50 text-sky-700" }[tone];
  return (
    <Link href={href} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5 transition-colors hover:bg-slate-50">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${cls}`}><Icon className="h-5 w-5" /></span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-slate-900">{title}</span>
        <span className="block truncate text-xs text-slate-500">{hint}</span>
      </span>
    </Link>
  );
}

export default async function AdminDashboardPage() {
  let data: Awaited<ReturnType<typeof loadOverview>> | null = null;
  try {
    data = await loadOverview();
  } catch {
    data = null;
  }
  if (!data) {
    return <div className="p-4 sm:p-8"><ErrorState message="We couldn't load the overview. Refresh the page to try again." /></div>;
  }

  const { stats, attention, today } = data;
  const cards = [
    { label: "Total bookings", value: String(stats.total), icon: Calendar },
    { label: "Active cleaners", value: String(stats.cleaners), icon: Users },
    { label: "Jobs in progress", value: String(stats.inProgress), icon: Clock },
    { label: "This month's revenue", value: formatCurrency(stats.revenue), icon: PoundSterling },
  ];

  const items: React.ReactNode[] = [];
  if (attention.enquiries) items.push(<AttentionItem key="enq" href="/admin/bookings" icon={Inbox} tone="sky" title={`${attention.enquiries} new enquir${attention.enquiries === 1 ? "y" : "ies"}`} hint="Build and send a quote" />);
  if (attention.applications) items.push(<AttentionItem key="app" href="/admin/applications" icon={UserPlus} tone="sky" title={`${attention.applications} cleaner application${attention.applications === 1 ? "" : "s"} to review`} hint="Approve or decline" />);
  if (attention.claimed) items.push(<AttentionItem key="dep" href="/admin/bookings" icon={Landmark} tone="amber" title={`${attention.claimed} deposit${attention.claimed === 1 ? "" : "s"} to verify`} hint="Customer says they've paid by bank transfer" />);
  if (attention.unassigned) items.push(<AttentionItem key="una" href="/admin/bookings" icon={UserX} tone="amber" title={`${attention.unassigned} confirmed job${attention.unassigned === 1 ? "" : "s"} without a cleaner`} hint="Open it and press Auto-assign" />);
  if (attention.overdueCount) items.push(<AttentionItem key="od" href="/admin/invoices" icon={Receipt} tone="red" title={`${attention.overdueCount} overdue invoice${attention.overdueCount === 1 ? "" : "s"}`} hint={`${formatCurrency(attention.overdueTotal)} outstanding`} />);
  for (const b of attention.flagged) items.push(<AttentionItem key={b.id} href={`/admin/bookings/${b.id}`} icon={AlertTriangle} tone="red" title={`${b.reference} needs attention`} hint={b.flag_reason ?? "Flagged"} />);

  return (
    <div className="p-4 sm:p-8">
      <h1 className="font-display text-2xl font-extrabold text-slate-900">Dashboard</h1>
      <p className="mt-1 text-sm text-slate-500">Overview of bookings, cleaners and revenue.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">{c.label}</span>
              <c.icon className="h-4 w-4 text-brand-green-600" />
            </div>
            <p className="mt-2 font-display text-2xl font-extrabold text-slate-900">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="font-bold text-slate-900">Needs your attention</h2>
          <div className="mt-3 space-y-2">
            {items.length ? items : (
              <div className="flex items-center gap-3 rounded-xl border border-brand-green-200 bg-brand-green-50 p-4 text-sm font-semibold text-brand-green-800">
                <CheckCircle2 className="h-5 w-5" /> All clear — nothing is waiting on you.
              </div>
            )}
          </div>
        </section>

        <section>
          <h2 className="font-bold text-slate-900">Today&apos;s jobs <span className="font-normal text-slate-400">· {data.todayLabel}</span></h2>
          <div className="mt-3 space-y-2">
            {today.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-400">No jobs scheduled for today.</p>
            ) : today.map((j: any) => {
              const customer = oneOf<{ full_name: string }>(j.customer);
              const cleaner = oneOf<{ full_name: string }>(j.cleaner);
              return (
                <Link key={j.id} href={`/admin/bookings/${j.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5 hover:bg-slate-50">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-slate-900">{customer?.full_name ?? "Customer"} · {SERVICE_LABELS[j.service_type as ServiceType]}</span>
                    <span className="block text-xs text-slate-500">{j.clean_time ? String(j.clean_time).slice(0, 5) : "Time TBC"} · {cleaner ? cleaner.full_name : "No cleaner yet"}</span>
                  </span>
                  <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{BOOKING_STATUS_LABELS[j.status as BookingStatus]}</span>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
