import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireCleaner } from "@/lib/cleaner-auth";
import { getOwnedJob } from "@/lib/cleaner-jobs";
import { createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
const MAX_PHOTOS_PER_KIND = 30;

const bodySchema = z.object({
  kind: z.enum(["before", "after"]),
  /** Storage object path inside the private `job-photos` bucket: `<bookingId>/<file>`. */
  path: z.string().min(3).max(300),
});

/**
 * POST /api/cleaner/jobs/[id]/photos — register a photo the app has already
 * uploaded to storage. We verify the path is inside THIS job's folder and that
 * the object really exists before recording it, so the photo list can't be
 * pointed at arbitrary or someone else's files.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireCleaner();
  if (!auth.ok) return auth.response;
  const owned = await getOwnedJob(auth.session.cleanerId, params.id);
  if (!owned.ok) return owned.response;
  const { job } = owned;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, error: "Invalid photo" }, { status: 400 });
  const { kind, path } = parsed.data;

  const [folder, file, ...rest] = path.split("/");
  if (folder !== job.id || !file || rest.length || file.includes("..")) {
    return NextResponse.json({ success: false, error: "Invalid photo path" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: found } = await supabase.storage.from("job-photos").list(job.id, { search: file, limit: 1 });
  if (!found?.some((o) => o.name === file)) {
    return NextResponse.json({ success: false, error: "Photo hasn't finished uploading" }, { status: 400 });
  }

  const column = kind === "before" ? "before_photos" : "after_photos";
  const existing = ((job[column] ?? []) as string[]);
  if (existing.includes(path)) return NextResponse.json({ success: true, photos: existing });
  if (existing.length >= MAX_PHOTOS_PER_KIND) {
    return NextResponse.json({ success: false, error: `Maximum ${MAX_PHOTOS_PER_KIND} ${kind} photos` }, { status: 400 });
  }

  const photos = [...existing, path];
  const { error } = await supabase.from("bookings").update({ [column]: photos }).eq("id", job.id);
  if (error) return NextResponse.json({ success: false, error: "Couldn't save photo" }, { status: 500 });
  return NextResponse.json({ success: true, photos });
}
