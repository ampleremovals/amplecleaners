/* eslint-disable @typescript-eslint/no-explicit-any -- untyped Supabase client */
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { ErrorState } from "@/components/admin/DataState";
import { Reveal } from "@/components/admin/dashboard/motion";
import { RevenueHero, type SummaryChip } from "@/components/admin/dashboard/RevenueHero";
import { ActivityFeed, Attention, Pipeline, QuickActions, TeamToday, TodayTimeline, WeekLoad } from "@/components/admin/dashboard/Panels";
import { loadOverview, type Overview } from "@/lib/admin/overview";
import { greetingFor } from "@/lib/admin/overview-shared";

export const dynamic = "force-dynamic";

/** First name for the greeting. Only a real saved name is used — never guessed from an email address. */
async function firstName(): Promise<string | null> {
  try {
    const { data: { user } } = await (await createClient()).auth.getUser();
    if (!user) return null;
    const db: any = createAdminClient();
    const { data } = await db.from("admin_users").select("full_name").eq("supabase_user_id", user.id).maybeSingle();
    const name = (data?.full_name as string | null)?.trim().split(/\s+/)[0];
    return name || null;
  } catch {
    return null;
  }
}

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

/** The most urgent things, phrased as the chips under the greeting. */
function summaryChips(a: Overview["attention"]): SummaryChip[] {
  const chips: SummaryChip[] = [];
  if (a.overdueCount) chips.push({ label: `${a.overdueCount} overdue ${plural(a.overdueCount, "invoice", "invoices")}`, href: "/admin/invoices", tone: "critical" });
  if (a.flagged.length) chips.push({ label: `${a.flagged.length} ${plural(a.flagged.length, "booking needs", "bookings need")} attention`, href: "/admin/bookings", tone: "critical" });
  if (a.unassigned) chips.push({ label: `${a.unassigned} ${plural(a.unassigned, "job needs", "jobs need")} a cleaner`, href: "/admin/bookings", tone: "warning" });
  if (a.claimed) chips.push({ label: `${a.claimed} ${plural(a.claimed, "deposit", "deposits")} to verify`, href: "/admin/bookings", tone: "warning" });
  if (a.enquiries) chips.push({ label: `${a.enquiries} new ${plural(a.enquiries, "enquiry", "enquiries")}`, href: "/admin/bookings", tone: "info" });
  if (a.applications) chips.push({ label: `${a.applications} cleaner ${plural(a.applications, "application", "applications")}`, href: "/admin/applications", tone: "info" });
  return chips;
}

export default async function AdminDashboardPage() {
  let data: Overview | null = null;
  try {
    data = await loadOverview();
  } catch {
    data = null;
  }
  if (!data) {
    return <div className="p-4 sm:p-8"><ErrorState message="We couldn't load the overview. Refresh the page to try again." /></div>;
  }
  const name = await firstName();
  const dateLabel = new Date(`${data.today}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6 px-4 py-6 sm:px-8 sm:py-8">
      <Reveal>
        <RevenueHero
          greeting={greetingFor()}
          name={name}
          dateLabel={dateLabel}
          chips={summaryChips(data.attention)}
          ranges={data.revenue.ranges}
          thisMonth={data.revenue.thisMonth}
          bookingsSeries={data.bookingsSeries.map((d) => d.count)}
          bookingsTotal={data.bookingsSeries.reduce((s, d) => s + d.count, 0)}
          outstanding={data.outstanding}
          jobsToday={data.todayJobs.length}
          inProgress={data.inProgressToday}
          cleaners={data.cleanersActive}
          unassigned={data.unassigned}
        />
      </Reveal>

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <Reveal delay={0.08} className="min-w-0"><WeekLoad days={data.weekLoad} /></Reveal>
        <Reveal delay={0.14} className="min-w-0"><Pipeline stages={data.pipeline} /></Reveal>
        <Reveal delay={0.2} className="min-w-0 lg:col-span-2 xl:col-span-1"><TeamToday team={data.team} /></Reveal>
      </div>

      {/* Two independent columns, so each panel is exactly as tall as its content (no big empty boxes). */}
      <div className="grid items-start gap-6 xl:grid-cols-3">
        <div className="min-w-0 space-y-6 xl:col-span-2">
          <Reveal delay={0.1}><TodayTimeline jobs={data.todayJobs} /></Reveal>
          <Reveal delay={0.16}><ActivityFeed items={data.activity} /></Reveal>
        </div>
        <div className="min-w-0 space-y-6">
          <Reveal delay={0.13}><Attention a={data.attention} /></Reveal>
          <Reveal delay={0.19}><QuickActions /></Reveal>
        </div>
      </div>
    </div>
  );
}
