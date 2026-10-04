import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireCleaner } from "@/lib/cleaner-auth";
import { getOwnedJob } from "@/lib/cleaner-jobs";
import { createAdminClient } from "@/lib/supabase/server";
import type { CleaningTask } from "@/types";

export const runtime = "nodejs";

const bodySchema = z.object({ tasks: z.array(z.object({ key: z.string().max(200), done: z.boolean() })).max(200) });

/**
 * PUT /api/cleaner/jobs/[id]/tasks — tick/untick checklist items. A cleaner can
 * ONLY flip `done` on tasks that already exist; they can't add, remove or
 * rename tasks (we merge by key onto the stored checklist).
 */
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireCleaner();
  if (!auth.ok) return auth.response;
  const owned = await getOwnedJob(auth.session.cleanerId, params.id);
  if (!owned.ok) return owned.response;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, error: "Invalid tasks" }, { status: 400 });

  const doneByKey = new Map(parsed.data.tasks.map((t) => [t.key, t.done]));
  const merged = ((owned.job.tasks ?? []) as CleaningTask[]).map((t) => (doneByKey.has(t.key) ? { ...t, done: doneByKey.get(t.key)! } : t));

  const { error } = await createAdminClient().from("bookings").update({ tasks: merged }).eq("id", owned.job.id);
  if (error) return NextResponse.json({ success: false, error: "Couldn't save" }, { status: 500 });
  return NextResponse.json({ success: true, tasks: merged });
}
