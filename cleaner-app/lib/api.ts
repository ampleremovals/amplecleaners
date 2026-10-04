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
