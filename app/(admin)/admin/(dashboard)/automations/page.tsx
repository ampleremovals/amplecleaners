"use client";

import { Suspense, useState } from "react";
import { useAdminFetch } from "@/hooks/useAdminFetch";
import { ErrorState } from "@/components/admin/DataState";
import { AdminHero, AdminPage } from "@/components/admin/kit";
import { Segmented } from "@/components/admin/controls";
import { Skeleton } from "@/components/ui/skeleton";
import { JourneysTab, type Health, type Journey } from "@/components/admin/email/JourneysTab";
import { TemplatesTab } from "@/components/admin/email/TemplatesTab";
import { LogTab } from "@/components/admin/email/LogTab";
import { CampaignsTab } from "@/components/admin/email/CampaignsTab";
import { FunnelTab } from "@/components/admin/email/FunnelTab";
import { AudienceTab } from "@/components/admin/email/AudienceTab";
import { pct } from "@/components/admin/email/parts";

interface Overview {
  success: boolean; journeys: Journey[]; health: Health; suppressed: number; variables: Record<string, string>;
  stats: { total: { sent: number; delivered: number; opened: number; clicked: number; bounced: number }; queue: { scheduled: number; failed: number; skipped: number } };
}

const TABS = [
  { key: "journeys", label: "Journeys" }, { key: "templates", label: "Templates" }, { key: "campaigns", label: "Campaigns" },
  { key: "funnel", label: "Results" }, { key: "log", label: "Send log" }, { key: "audience", label: "Do not email" },
] as const;
type Tab = (typeof TABS)[number]["key"];

function AutomationsInner() {
  const { data, loading, error, reload } = useAdminFetch<Overview>("/api/admin/email/overview");
  const [tab, setTab] = useState<Tab>("journeys");
  const [focusTemplate, setFocusTemplate] = useState<string | null>(null);

  const t = data?.stats.total;
  return (
    <AdminPage>
      <AdminHero
        eyebrow="Growth"
        title="Automations"
        description="Every email that turns an enquiry into a booking and a customer into a regular. Edit the wording, set the timing, switch journeys on or off, and see what works."
        stats={data && t ? [
          { label: "Emails sent (30 days)", value: t.sent, hint: data.stats.queue.scheduled ? `${data.stats.queue.scheduled} waiting to go` : "Nothing waiting" },
          { label: "Opened", value: t.delivered || t.opened ? pct(t.opened, t.sent) : "–", hint: t.delivered || t.opened ? "of emails sent" : "Needs delivery tracking" },
          { label: "Clicked", value: t.delivered || t.clicked ? pct(t.clicked, t.sent) : "–", hint: t.delivered || t.clicked ? "of emails sent" : "Needs delivery tracking" },
          { label: "Won't be emailed", value: data.suppressed, hint: data.stats.queue.failed ? `${data.stats.queue.failed} failed to send` : "Unsubscribed or bounced", tone: data.stats.queue.failed ? "warning" : "default" },
        ] : undefined}
      >
        <div className="mt-5 overflow-x-auto pb-1">
          <Segmented tone="dark" label="Section" value={tab} onChange={setTab} options={TABS.map((x) => ({ key: x.key, label: x.label }))} />
        </div>
      </AdminHero>

      {error ? <ErrorState message={error} onRetry={reload} /> : loading && !data ? <Skeleton className="h-96 w-full rounded-xl" /> : data && (
        <>
          {tab === "journeys" && <JourneysTab journeys={data.journeys} health={data.health} onChanged={reload} onEdit={(k) => { setFocusTemplate(k); setTab("templates"); }} />}
          {tab === "templates" && <TemplatesTab variables={data.variables} focusKey={focusTemplate} onChanged={reload} />}
          {tab === "campaigns" && <CampaignsTab />}
          {tab === "funnel" && <FunnelTab stats={data.stats.total} />}
          {tab === "log" && <LogTab />}
          {tab === "audience" && <AudienceTab onChanged={reload} />}
        </>
      )}
    </AdminPage>
  );
}

export default function AutomationsPage() {
  return <Suspense fallback={null}><AutomationsInner /></Suspense>;
}
