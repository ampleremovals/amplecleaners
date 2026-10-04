/** Pure date/time helpers for change-window rules (Europe/London), unit-tested. */

export const FREE_CHANGE_HOURS = 48;

const londonParts = (now: Date) => {
  const f = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
  });
  const p = Object.fromEntries(f.formatToParts(now).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, minutes: (Number(p.hour) % 24) * 60 + Number(p.minute) };
};

const dayNumber = (isoDate: string) => {
  const [y, m, d] = isoDate.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
};

/** Hours from `now` until the job starts (UK wall-clock). No time → treated as 09:00. Negative if already past. */
export function hoursUntilJob(cleanDate: string, cleanTime: string | null | undefined, now: Date = new Date()): number {
  const nowL = londonParts(now);
  const m = /^(\d{1,2}):(\d{2})/.exec(cleanTime ?? "");
  const jobMinutes = m ? Number(m[1]) * 60 + Number(m[2]) : 9 * 60;
  return (dayNumber(cleanDate) - dayNumber(nowL.date)) * 24 + (jobMinutes - nowL.minutes) / 60;
}

/** Customers may change/cancel for free until 48h before the job. */
export function isWithinFreeChangeWindow(cleanDate: string | null, cleanTime: string | null | undefined, now: Date = new Date()): boolean {
  if (!cleanDate) return true; // flexible date: nothing is imminent
  return hoursUntilJob(cleanDate, cleanTime, now) >= FREE_CHANGE_HOURS;
}

/** Earliest and latest dates a customer may self-serve reschedule to. */
export function rescheduleBounds(now: Date = new Date()): { min: string; max: string } {
  const today = londonParts(now).date;
  const shift = (days: number) => new Date((dayNumber(today) + days) * 86_400_000).toISOString().slice(0, 10);
  return { min: shift(2), max: shift(180) };
}

/** Statuses where a job is still changeable (not started, not finished, not already ended). */
export const CHANGEABLE_STATUSES = [
  "inquiry", "called", "not_called", "answered", "not_answered",
  "quote_sent", "deposit_invoice_sent", "booking_confirmed", "cleaner_assigned",
] as const;
export const isChangeable = (status: string) => (CHANGEABLE_STATUSES as readonly string[]).includes(status);
