import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge conditional Tailwind class strings. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a numeric amount as GBP, e.g. `£1,250.00`. */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency", currency: "GBP", minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

/** Format a date as `DD/MM/YYYY` (UK style). */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "—";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

/** Format a time as `HH:MM`. */
export function formatTime(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

/** Friendly weekday label, e.g. "Mon 14 Jun". */
export function formatDayLabel(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

/** Local YYYY-MM-DD for a date (avoids UTC off-by-one). */
export function toDateKey(d: Date): string {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().split("T")[0];
}

/** Is this date today (local)? */
export function isToday(date: string | Date | null | undefined): boolean {
  if (!date) return false;
  const d = typeof date === "string" ? new Date(date) : date;
  return toDateKey(d) === toDateKey(new Date());
}

/** Privacy-safe customer label: "Jane S." */
export function customerShortName(fullName?: string | null): string {
  if (!fullName) return "Customer";
  const [first, last] = fullName.split(" ");
  return last ? `${first} ${last[0]}.` : first;
}

/** Human label for a service_type slug. */
export function serviceLabel(s?: string | null): string {
  return (s ?? "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Human label for a driver job status. */
export const JOB_STATUS_LABELS: Record<string, string> = {
  not_started: "Not started",
  on_my_way: "On my way",
  twenty_mins_away: "20 mins away",
  ten_mins_away: "10 mins away",
  arrived: "Arrived",
  fifteen_mins_to_delivery: "15 mins to delivery",
  job_completed: "Job completed",
};
