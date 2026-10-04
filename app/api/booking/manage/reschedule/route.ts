import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { manageBodySchema, tokenOk, assertFreeWindow } from "@/lib/bookings/manage";
import { rateLimit } from "@/lib/rate-limit";
import { rescheduleBounds } from "@/lib/bookings/timing";
import { rescheduleBooking } from "@/lib/bookings/changes";

export const runtime = "nodejs";
export const maxDuration = 30;

const schema = manageBodySchema.extend({
  cleanDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  cleanTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
});

/**
 * POST — a customer moves their own clean. Rules enforced here, not in the UI:
 * valid link, ≥48h before the current slot, new date between today+2 and +180.
 */
export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, "manage-reschedule", 10, 3600);
  if (limited) return limited;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, error: "Please choose a valid date." }, { status: 400 });
  const { bookingId, token, cleanDate, cleanTime } = parsed.data;
  if (!tokenOk(bookingId, token)) return NextResponse.json({ success: false, error: "This link is invalid." }, { status: 401 });

  const bounds = rescheduleBounds();
  if (cleanDate < bounds.min || cleanDate > bounds.max) {
    return NextResponse.json({ success: false, error: "Please choose a date at least 2 days from now (and within 6 months)." }, { status: 400 });
  }
  const window = await assertFreeWindow(bookingId);
  if (!window.ok) return window.response;

  const result = await rescheduleBooking(bookingId, { cleanDate, cleanTime }, { actor: "customer" });
  if (!result.ok) return NextResponse.json({ success: false, error: result.error }, { status: result.status });
  return NextResponse.json({ success: true });
}
