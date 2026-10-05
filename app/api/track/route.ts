import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { isTrackablePath, recordEvent } from "@/lib/tracking";

export const runtime = "nodejs";

const schema = z.object({
  path: z.string().max(120),
  utm_source: z.string().max(100).optional(),
  utm_medium: z.string().max(100).optional(),
  utm_campaign: z.string().max(100).optional(),
  /** Hostname of an EXTERNAL referrer only (e.g. "www.google.com"), never a full URL. */
  referrer_host: z.string().max(100).optional(),
});

/**
 * POST /api/track — a cookie-free page view. Always answers 204 so tracking can
 * never surface an error to a visitor; bad or non-allowlisted input is just dropped.
 */
export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !isTrackablePath(parsed.data.path)) return new NextResponse(null, { status: 204 });
  if (await rateLimit(req, "track", 120, 600)) return new NextResponse(null, { status: 204 });
  await recordEvent(req, { event: "page_view", ...parsed.data });
  return new NextResponse(null, { status: 204 });
}
