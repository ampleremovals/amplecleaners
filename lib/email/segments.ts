/* eslint-disable @typescript-eslint/no-explicit-any -- untyped Supabase client */
import { createAdminClient } from "@/lib/supabase/server";
import { DEAD_STATUSES } from "@/lib/email/guards";
import { todayInLondon } from "@/lib/cleaner-auth";
import { SERVICE_LABELS, type ServiceType } from "@/types";

const COMPLETED = ["job_completed", "invoice_sent", "paid"];

export interface Recipient { customerId: string; email: string; firstName: string; serviceType: string; bookingId: string | null }

export const SEGMENTS: { key: string; label: string; hint: string }[] = [
  { key: "customers_all", label: "All past customers", hint: "Everyone who has had at least one clean" },
  { key: "lapsed_90", label: "Lapsed (90+ days)", hint: "Last clean over 90 days ago and nothing booked since" },
  { key: "one_off_only", label: "One-off customers", hint: "Had a clean but never a regular one" },
  { key: "recurring", label: "Regular customers", hint: "Weekly, fortnightly or monthly" },
  { key: "open_quotes", label: "Open quotes (7+ days old)", hint: "Got a price but never paid the deposit" },
  ...(Object.keys(SERVICE_LABELS) as ServiceType[]).map((s) => ({ key: `service:${s}`, label: `Had ${SERVICE_LABELS[s]}`, hint: `Customers who have had ${SERVICE_LABELS[s].toLowerCase()}` })),
];

const one = <T,>(x: T | T[] | null | undefined): T | null => (Array.isArray(x) ? (x[0] ?? null) : (x ?? null));

interface Profile { customerId: string; email: string; name: string; completed: number; lastClean: string | null; lastService: string; lastBookingId: string | null; recurring: boolean; hasLive: boolean; services: Set<string> }

/** Who is in a segment. Unsubscribed and bounced addresses are removed here, so counts are honest. */
export async function resolveSegment(segment: string, now = new Date()): Promise<Recipient[]> {
  const db: any = createAdminClient();
  const today = todayInLondon(now);
  const { data: bs } = await db.from("bookings").select("id, customer_id, service_type, frequency, clean_date, status, parent_booking_id, quote_sent_at, customer:customers(id, full_name, email)")
    .not("status", "in", `(${DEAD_STATUSES.join(",")})`).limit(5000);
  const profiles = new Map<string, Profile>();
  const open: Recipient[] = [];
  for (const b of bs ?? []) {
    const c = one<any>(b.customer);
    if (!c?.email) continue;
    let p = profiles.get(c.id);
    if (!p) { p = { customerId: c.id, email: c.email, name: c.full_name, completed: 0, lastClean: null, lastService: b.service_type, lastBookingId: null, recurring: false, hasLive: false, services: new Set() }; profiles.set(c.id, p); }
    if (b.frequency !== "one_off" || b.parent_booking_id) p.recurring = true;
    if (COMPLETED.includes(b.status)) {
      p.completed++;
      p.services.add(b.service_type);
      if (!p.lastClean || (b.clean_date && b.clean_date > p.lastClean)) { p.lastClean = b.clean_date; p.lastService = b.service_type; p.lastBookingId = b.id; }
    } else {
      p.hasLive = true;
    }
    if (b.status === "quote_sent" && b.quote_sent_at && new Date(b.quote_sent_at).getTime() < now.getTime() - 7 * 86_400_000) {
      open.push({ customerId: c.id, email: c.email, firstName: String(c.full_name).split(/\s+/)[0], serviceType: b.service_type, bookingId: b.id });
    }
  }
  const cutoff = new Date(new Date(`${today}T00:00:00Z`).getTime() - 90 * 86_400_000).toISOString().slice(0, 10);
  let picked: Recipient[];
  if (segment === "open_quotes") {
    picked = open;
  } else {
    const keep = (p: Profile) => {
      if (p.completed < 1) return false;
      if (segment === "customers_all") return true;
      if (segment === "lapsed_90") return !p.hasLive && !!p.lastClean && p.lastClean < cutoff;
      if (segment === "one_off_only") return !p.recurring;
      if (segment === "recurring") return p.recurring;
      if (segment.startsWith("service:")) return p.services.has(segment.slice(8));
      return false;
    };
    picked = [...profiles.values()].filter(keep).map((p) => ({ customerId: p.customerId, email: p.email, firstName: String(p.name).split(/\s+/)[0], serviceType: p.lastService, bookingId: p.lastBookingId }));
  }
  const { data: sup } = await db.from("email_suppressions").select("email");
  const blocked = new Set((sup ?? []).map((s: any) => s.email));
  const seen = new Set<string>();
  return picked.filter((r) => {
    const e = r.email.toLowerCase();
    if (blocked.has(e) || seen.has(e)) return false;
    seen.add(e);
    return true;
  });
}
