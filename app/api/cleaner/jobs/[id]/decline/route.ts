import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireCleaner } from "@/lib/cleaner-auth";
import { getOwnedJob } from "@/lib/cleaner-jobs";
import { releaseJob } from "@/lib/bookings/release";

export const runtime = "nodejs";
export const maxDuration = 30;

const schema = z.object({ reason: z.string().trim().min(2).max(300) });

/** POST /api/cleaner/jobs/[id]/decline { reason } — "I can't make it". Re-matches automatically. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireCleaner();
  if (!auth.ok) return auth.response;
  const owned = await getOwnedJob(auth.session.cleanerId, params.id);
  if (!owned.ok) return owned.response;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, error: "Please tell us briefly why you can't make it." }, { status: 400 });

  const result = await releaseJob(params.id, auth.session.cleanerId, { reason: parsed.data.reason, kind: "declined" });
  if (!result.ok) return NextResponse.json({ success: false, error: result.error }, { status: result.status });
  return NextResponse.json({ success: true, reassigned: result.reassigned });
}
