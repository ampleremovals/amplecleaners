/* eslint-disable @typescript-eslint/no-explicit-any -- untyped Supabase client */
import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";

/** Fields a cleaner route needs from a job it already owns. */
const OWNED_JOB_SELECT = "id, reference, status, clean_date, clock_in_at, clock_out_at, tasks, before_photos, after_photos, assigned_cleaner_id, parent_booking_id";

/**
 * Loads a booking ONLY if it's assigned to this cleaner. A cleaner asking for
 * someone else's job gets the same 404 as a missing one (no existence leak).
 */
export async function getOwnedJob(
  cleanerId: string,
  jobId: string,
): Promise<{ ok: true; job: any } | { ok: false; response: NextResponse }> {
  const idOk = z.string().uuid().safeParse(jobId).success;
  const { data } = idOk
    ? await createAdminClient().from("bookings").select(OWNED_JOB_SELECT).eq("id", jobId).eq("assigned_cleaner_id", cleanerId).maybeSingle()
    : { data: null };
  if (!data) return { ok: false, response: NextResponse.json({ success: false, error: "Job not found" }, { status: 404 }) };
  return { ok: true, job: data };
}

export const locationSchema = z.object({
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});
