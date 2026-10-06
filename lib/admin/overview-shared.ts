/**
 * Browser-safe pieces of the dashboard data layer: constants, types and pure helpers.
 * Kept apart from `overview.ts` (which talks to the database with server-only code) so client components
 * can import these without dragging server modules into the browser bundle.
 */

export const RANGE_DAYS = [7, 14, 30] as const;
export type RangeDays = (typeof RANGE_DAYS)[number];

export interface DayPoint { day: string; amount: number }
export interface RevenueRange { series: DayPoint[]; total: number; previousTotal: number }

export type TeamState = "on_job" | "booked" | "available";
export interface TeamMember { id: string; name: string; state: TeamState; detail: string }

/** YYYY-MM-DD shifted by whole days (pure calendar arithmetic, no timezone involved). */
export function shiftDay(ymd: string, days: number): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export const londonDay = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: "Europe/London" });

export function greetingFor(now = new Date()): string {
  const hour = Number(now.toLocaleString("en-GB", { hour: "numeric", hour12: false, timeZone: "Europe/London" }));
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

/** "3 min ago", "2h ago", "yesterday", "5 Oct" — compact relative time for the activity feed. */
export function timeAgo(iso: string, now = Date.now()): string {
  const mins = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Europe/London" });
}
