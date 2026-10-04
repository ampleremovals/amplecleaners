import { createAdminClient } from "@/lib/supabase/server";
import { Calendar, Users, PoundSterling, Clock } from "lucide-react";

async function getStats() {
  try {
    const supabase = createAdminClient();
    const [{ count: totalBookings }, { count: activeCleaners }, { count: inProgress }] = await Promise.all([
      supabase.from("bookings").select("id", { count: "exact", head: true }),
      supabase.from("cleaners").select("id", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("bookings").select("id", { count: "exact", head: true }).eq("status", "in_progress"),
    ]);
    return {
      totalBookings: totalBookings ?? 0,
      activeCleaners: activeCleaners ?? 0,
      inProgress: inProgress ?? 0,
    };
  } catch {
    // No Supabase project configured yet — show zeros rather than crash the page.
    return { totalBookings: 0, activeCleaners: 0, inProgress: 0 };
  }
}

export default async function AdminDashboardPage() {
  const stats = await getStats();
  const cards = [
    { label: "Total bookings", value: stats.totalBookings, icon: Calendar },
    { label: "Active cleaners", value: stats.activeCleaners, icon: Users },
    { label: "Jobs in progress", value: stats.inProgress, icon: Clock },
    { label: "This month's revenue", value: "£0.00", icon: PoundSterling },
  ];

  return (
    <div className="p-6 sm:p-8">
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

      <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
        The bookings pipeline board, cleaner rota and invoicing views are the next build phase —
        see <code className="rounded bg-slate-100 px-1.5 py-0.5">tasks/todo.md</code> for the plan.
      </div>
    </div>
  );
}
