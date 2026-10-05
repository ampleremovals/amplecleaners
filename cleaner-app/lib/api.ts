import { File } from "expo-file-system";
import { supabase } from "./supabase";
import { ENV } from "./env";

export interface CleanerTask {
  key: string;
  label: string;
  area: string;
  done: boolean;
}

export interface JobSummary {
  id: string;
  reference: string;
  service_type: string;
  status: string;
  clean_date: string | null;
  clean_time: string | null;
  quote_total: number | null;
  property_type: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  special_instructions: string | null;
  tasks: CleanerTask[] | null;
  before_photos: string[] | null;
  after_photos: string[] | null;
  clock_in_at: string | null;
  clock_out_at: string | null;
  customer: { full_name: string; phone: string } | null;
  address: { line_1: string; line_2: string | null; city: string | null; postcode: string } | null;
}

export interface LatLng {
  lat: number;
  lng: number;
}

export class ApiError extends Error {}

/**
 * Calls the Ample Cleaners server (the single place cleaner WRITES happen) with
 * the signed-in cleaner's Supabase token. The server decides what a cleaner may
 * change; the app never writes booking rows directly.
 */
async function authed<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new ApiError("You've been signed out — please sign in again.");

  let res: Response;
  try {
    res = await fetch(`${ENV.SITE_URL}${path}`, {
      method: init.method ?? "GET",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  } catch {
    throw new ApiError("No connection — check your signal and try again.");
  }
  const json = (await res.json().catch(() => null)) as (T & { success?: boolean; error?: string }) | null;
  if (!res.ok || !json || json.success === false) throw new ApiError(json?.error ?? `Something went wrong (${res.status}).`);
  return json;
}

const JOB_SELECT = `
  id, reference, service_type, status, clean_date, clean_time, quote_total,
  property_type, bedrooms, bathrooms, special_instructions, tasks,
  before_photos, after_photos, clock_in_at, clock_out_at,
  customer:customers(full_name, phone),
  address:addresses(line_1, line_2, city, postcode)
`;

/** Jobs assigned to `cleanerId` for today, soonest first. RLS already scopes
 *  this to the signed-in cleaner's own bookings — no extra filter needed. */
export async function getTodayJobs(cleanerId: string, todayISO: string): Promise<JobSummary[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select(JOB_SELECT)
    .eq("assigned_cleaner_id", cleanerId)
    .eq("clean_date", todayISO)
    .order("clean_time", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as JobSummary[];
}

/** Upcoming jobs (today onward), soonest first. */
export async function getUpcomingJobs(cleanerId: string, fromISO: string): Promise<JobSummary[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select(JOB_SELECT)
    .eq("assigned_cleaner_id", cleanerId)
    .gte("clean_date", fromISO)
    .order("clean_date", { ascending: true })
    .order("clean_time", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as JobSummary[];
}

export async function getJob(jobId: string): Promise<JobSummary | null> {
  const { data, error } = await supabase.from("bookings").select(JOB_SELECT).eq("id", jobId).maybeSingle();
  if (error) throw error;
  return (data as unknown as JobSummary) ?? null;
}

export async function updateTasks(jobId: string, tasks: CleanerTask[]): Promise<void> {
  await authed(`/api/cleaner/jobs/${jobId}/tasks`, { method: "PUT", body: { tasks: tasks.map((t) => ({ key: t.key, done: t.done })) } });
}

export async function clockIn(jobId: string, location?: LatLng): Promise<void> {
  await authed(`/api/cleaner/jobs/${jobId}/clock-in`, { method: "POST", body: location ?? {} });
}

/** Finishing a job automatically invoices the customer server-side. */
export async function clockOut(jobId: string, location?: LatLng): Promise<void> {
  await authed(`/api/cleaner/jobs/${jobId}/clock-out`, { method: "POST", body: location ?? {} });
}

/** Uploads a captured photo to the private bucket, then registers it on the job. */
export async function uploadJobPhoto(jobId: string, kind: "before" | "after", uri: string): Promise<void> {
  const bytes = await new File(uri).bytes();
  const path = `${jobId}/${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const { error } = await supabase.storage.from("job-photos").upload(path, bytes, { contentType: "image/jpeg" });
  if (error) throw new ApiError("Photo upload failed — check your signal and try again.");
  await authed(`/api/cleaner/jobs/${jobId}/photos`, { method: "POST", body: { kind, path } });
}

/** Short-lived signed URLs so the cleaner can see thumbnails of what they uploaded. */
export async function signPhotos(paths: string[]): Promise<string[]> {
  if (!paths.length) return [];
  const { data } = await supabase.storage.from("job-photos").createSignedUrls(paths, 3600);
  return (data ?? []).flatMap((d) => (d.signedUrl ? [d.signedUrl] : []));
}

export interface EarningsSummary {
  payRate: number | null;
  week: { hours: number; earned: number };
  month: { hours: number; earned: number };
  allTime: { hours: number; earned: number };
  recent: { id: string; reference: string; serviceType: string; date: string; hours: number; earned: number }[];
}

export async function getEarnings(): Promise<EarningsSummary> {
  return authed<EarningsSummary>("/api/cleaner/earnings");
}

export async function registerPushToken(token: string, platform: "ios" | "android"): Promise<void> {
  await authed("/api/cleaner/push-token", { method: "POST", body: { token, platform } });
}

export async function unregisterPushToken(token: string): Promise<void> {
  await authed("/api/cleaner/push-token", { method: "DELETE", body: { token, platform: undefined } });
}

/** "I can't make it" — the job goes back to the office and is re-matched automatically. */
export async function declineJob(jobId: string, reason: string): Promise<{ reassigned: boolean }> {
  const res = await authed<{ reassigned: boolean }>(`/api/cleaner/jobs/${jobId}/decline`, { method: "POST", body: { reason } });
  return { reassigned: !!res.reassigned };
}

export interface AvailabilitySlot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export async function getAvailability(): Promise<AvailabilitySlot[]> {
  return (await authed<{ slots: AvailabilitySlot[] }>("/api/cleaner/availability")).slots;
}

export async function saveAvailability(slots: AvailabilitySlot[]): Promise<void> {
  await authed("/api/cleaner/availability", { method: "PUT", body: { slots } });
}

export interface TimeOff {
  id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
}

export async function getTimeOff(): Promise<TimeOff[]> {
  return (await authed<{ timeOff: TimeOff[] }>("/api/cleaner/time-off")).timeOff;
}

export async function addTimeOff(startDate: string, endDate: string, reason?: string): Promise<{ released: number; reassigned: number }> {
  const res = await authed<{ released: number; reassigned: number }>("/api/cleaner/time-off", { method: "POST", body: { startDate, endDate, reason } });
  return { released: res.released ?? 0, reassigned: res.reassigned ?? 0 };
}

export async function deleteTimeOff(id: string): Promise<void> {
  await authed(`/api/cleaner/time-off?id=${encodeURIComponent(id)}`, { method: "DELETE" });
}

export interface CleanerProfile {
  full_name: string;
  email: string;
  phone: string;
  dbs_verified: boolean;
  rating_avg: number | null;
  areas: string[];
}

/** The signed-in cleaner's own row (RLS limits this to them) plus their coverage areas. */
export async function getProfile(cleanerId: string): Promise<CleanerProfile | null> {
  const { data } = await supabase
    .from("cleaners")
    .select("full_name, email, phone, dbs_verified, rating_avg, cleaner_coverage_areas(postcode_prefix)")
    .eq("id", cleanerId)
    .maybeSingle();
  if (!data) return null;
  const row = data as unknown as Omit<CleanerProfile, "areas"> & { cleaner_coverage_areas: { postcode_prefix: string }[] | null };
  return {
    full_name: row.full_name, email: row.email, phone: row.phone, dbs_verified: row.dbs_verified,
    rating_avg: row.rating_avg == null ? null : Number(row.rating_avg),
    areas: (row.cleaner_coverage_areas ?? []).map((a) => a.postcode_prefix),
  };
}
