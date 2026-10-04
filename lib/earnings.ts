/** Pure earnings maths (no I/O) — unit-tested in tests/earnings.test.ts. */

export interface WorkedJob {
  id: string;
  reference: string;
  service_type: string;
  clean_date: string | null;
  clock_in_at: string;
  clock_out_at: string;
}

export interface EarningsSummary {
  payRate: number | null;
  week: { hours: number; earned: number };
  month: { hours: number; earned: number };
  allTime: { hours: number; earned: number };
  recent: { id: string; reference: string; serviceType: string; date: string; hours: number; earned: number }[];
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Clocked hours between two timestamps (never negative). */
export function hoursWorked(clockIn: string, clockOut: string): number {
  const ms = new Date(clockOut).getTime() - new Date(clockIn).getTime();
  return ms > 0 ? round2(ms / 3_600_000) : 0;
}

/** Monday of the week containing `isoDate` (YYYY-MM-DD). */
export function startOfWeek(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  const offset = (d.getUTCDay() + 6) % 7; // Monday = 0
  d.setUTCDate(d.getUTCDate() - offset);
  return d.toISOString().slice(0, 10);
}

export function computeEarnings(jobs: WorkedJob[], payRate: number | null, todayIso: string): EarningsSummary {
  const weekStart = startOfWeek(todayIso);
  const monthStart = `${todayIso.slice(0, 7)}-01`;
  const sum = { week: { hours: 0, earned: 0 }, month: { hours: 0, earned: 0 }, allTime: { hours: 0, earned: 0 } };

  const rows = jobs.map((j) => {
    const hours = hoursWorked(j.clock_in_at, j.clock_out_at);
    const earned = payRate == null ? 0 : round2(hours * payRate);
    const date = j.clean_date ?? j.clock_out_at.slice(0, 10);
    sum.allTime.hours += hours; sum.allTime.earned += earned;
    if (date >= monthStart) { sum.month.hours += hours; sum.month.earned += earned; }
    if (date >= weekStart) { sum.week.hours += hours; sum.week.earned += earned; }
    return { id: j.id, reference: j.reference, serviceType: j.service_type, date, hours, earned };
  });

  const norm = (b: { hours: number; earned: number }) => ({ hours: round2(b.hours), earned: round2(b.earned) });
  return { payRate, week: norm(sum.week), month: norm(sum.month), allTime: norm(sum.allTime), recent: rows.slice(0, 30) };
}
