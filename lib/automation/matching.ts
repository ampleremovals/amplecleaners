/**
 * Pure cleaner-matching logic (no I/O) so it can be unit-tested directly.
 * A cleaner is ELIGIBLE for a job when they are DBS-verified, cover the job's
 * postcode, are available for the whole window, and have no overlapping job
 * (with a travel buffer). Eligible cleaners are ranked: the series' regular
 * cleaner first (continuity for recurring clients), then lightest workload,
 * then highest rating.
 */
import type { ServiceType } from "@/types";

export const TRAVEL_BUFFER_MIN = 30;
const DEFAULT_START_MIN = 9 * 60;

export interface MatchCleaner {
  id: string;
  fullName: string;
  dbsVerified: boolean;
  ratingAvg: number | null;
  coveragePrefixes: string[];
  availability: { dayOfWeek: number; startMin: number; endMin: number }[];
  /** Inclusive date ranges (YYYY-MM-DD) the cleaner is away. */
  timeOff?: { start: string; end: string }[];
}

export interface BusySlot {
  cleanerId: string;
  date: string;
  startMin: number;
  endMin: number;
}

export interface MatchJob {
  cleanDate: string;
  startMin: number | null;
  hours: number;
  postcode: string;
  preferredCleanerId?: string | null;
  /** Cleaners who already declined THIS job — never offered it again. */
  declinedBy?: string[];
}

/** "09:30" / "09:30:00" → 570. Null for empty/invalid. */
export function toMinutes(time: string | null | undefined): number | null {
  if (!time) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(time);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

/** 0 = Sunday … 6 = Saturday for a `YYYY-MM-DD` calendar date (timezone-proof). */
export function dayOfWeek(isoDate: string): number {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

const normalisePostcode = (p: string) => p.replace(/\s+/g, "").toUpperCase();

/** "SW1A 1AA" is covered by prefix "SW1", "SW1A" or "SW"; not by "SE". */
export function postcodeMatchesPrefix(postcode: string, prefix: string): boolean {
  const p = normalisePostcode(prefix);
  return p.length > 0 && normalisePostcode(postcode).startsWith(p);
}

const DEFAULT_HOURS: Record<ServiceType, number> = {
  regular_cleaning: 3,
  deep_cleaning: 5,
  end_of_tenancy: 6,
  office_cleaning: 3,
  after_builders: 6,
};

/** Regular cleans are priced per hour, so the quote's hour quantity IS the duration. */
export function estimateJobHours(service: ServiceType, lineItems: { quantity?: number }[] | null | undefined): number {
  if (service === "regular_cleaning") {
    const q = Number(lineItems?.[0]?.quantity);
    if (Number.isFinite(q) && q > 0) return q;
  }
  return DEFAULT_HOURS[service] ?? 3;
}

export type Rejection = "not_dbs_verified" | "declined" | "outside_area" | "time_off" | "unavailable" | "clash";

/** Why a cleaner can't take the job, or null if they can. */
export function rejectionFor(job: MatchJob, c: MatchCleaner, busy: BusySlot[]): Rejection | null {
  if (!c.dbsVerified) return "not_dbs_verified";
  if (job.declinedBy?.includes(c.id)) return "declined";
  if (!c.coveragePrefixes.some((p) => postcodeMatchesPrefix(job.postcode, p))) return "outside_area";

  if (c.timeOff?.some((t) => job.cleanDate >= t.start && job.cleanDate <= t.end)) return "time_off";

  const start = job.startMin ?? DEFAULT_START_MIN;
  const end = start + job.hours * 60;
  const dow = dayOfWeek(job.cleanDate);
  const slots = c.availability.filter((a) => a.dayOfWeek === dow);
  const covered =
    job.startMin == null
      ? slots.some((a) => a.endMin - a.startMin >= job.hours * 60)
      : slots.some((a) => a.startMin <= start && a.endMin >= end);
  if (!covered) return "unavailable";

  const clash = busy.some(
    (b) => b.cleanerId === c.id && b.date === job.cleanDate && start < b.endMin + TRAVEL_BUFFER_MIN && end + TRAVEL_BUFFER_MIN > b.startMin,
  );
  return clash ? "clash" : null;
}

export interface Ranked {
  cleaner: MatchCleaner;
  isPreferred: boolean;
  load: number;
}

/** Eligible cleaners, best first. `load` = jobs already assigned around the date. */
export function rankCleaners(job: MatchJob, cleaners: MatchCleaner[], busy: BusySlot[], load: Map<string, number>): Ranked[] {
  return cleaners
    .filter((c) => rejectionFor(job, c, busy) === null)
    .map((cleaner) => ({ cleaner, isPreferred: cleaner.id === job.preferredCleanerId, load: load.get(cleaner.id) ?? 0 }))
    .sort(
      (a, b) =>
        Number(b.isPreferred) - Number(a.isPreferred) ||
        a.load - b.load ||
        (b.cleaner.ratingAvg ?? 0) - (a.cleaner.ratingAvg ?? 0) ||
        a.cleaner.fullName.localeCompare(b.cleaner.fullName),
    );
}

/** Human-readable reason nobody matched — shown to the admin on the flagged booking. */
export function explainNoMatch(job: MatchJob, cleaners: MatchCleaner[], busy: BusySlot[]): string {
  if (!cleaners.length) return "there are no active cleaners on the roster";
  const counts: Record<Rejection, number> = { not_dbs_verified: 0, declined: 0, outside_area: 0, time_off: 0, unavailable: 0, clash: 0 };
  for (const c of cleaners) {
    const r = rejectionFor(job, c, busy);
    if (r) counts[r]++;
  }
  const parts: string[] = [];
  if (counts.not_dbs_verified) parts.push(`${counts.not_dbs_verified} not DBS-verified`);
  if (counts.declined) parts.push(`${counts.declined} already declined it`);
  if (counts.outside_area) parts.push(`${counts.outside_area} don't cover ${job.postcode.toUpperCase()}`);
  if (counts.time_off) parts.push(`${counts.time_off} on time off`);
  if (counts.unavailable) parts.push(`${counts.unavailable} not available at that time`);
  if (counts.clash) parts.push(`${counts.clash} already booked`);
  return `${cleaners.length} active cleaner${cleaners.length === 1 ? "" : "s"}: ${parts.join(", ")}`;
}
