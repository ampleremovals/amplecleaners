import { supabase } from "./supabase";

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
  const { error } = await supabase.from("bookings").update({ tasks }).eq("id", jobId);
  if (error) throw error;
}

export async function clockIn(jobId: string): Promise<void> {
  const { error } = await supabase
    .from("bookings")
    .update({ clock_in_at: new Date().toISOString(), status: "in_progress" })
    .eq("id", jobId);
  if (error) throw error;
}

export async function clockOut(jobId: string): Promise<void> {
  const { error } = await supabase
    .from("bookings")
    .update({ clock_out_at: new Date().toISOString(), status: "job_completed" })
    .eq("id", jobId);
  if (error) throw error;
}
