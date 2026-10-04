/* eslint-disable @typescript-eslint/no-explicit-any -- untyped Supabase client */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import { manageBodySchema, tokenOk, assertFreeWindow } from "@/lib/bookings/manage";
import { rateLimit } from "@/lib/rate-limit";
import { cancelBooking, stopSeries } from "@/lib/bookings/changes";

export const runtime = "nodejs";
export const maxDuration = 30;

const schema = manageBodySchema.extend({
  /** "visit" cancels just this clean; "series" ends a recurring booking and every future visit. */
  scope: z.enum(["visit", "series"]).default("visit"),
  reason: z.string().trim().max(500).optional(),
});

/** POST — a customer cancels (≥48h before this clean; otherwise they're asked to call). */
export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, "manage-cancel", 10, 3600);
  if (limited) return limited;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, error: "Invalid request." }, { status: 400 });
  const { bookingId, token, scope, reason } = parsed.data;
  if (!tokenOk(bookingId, token)) return NextResponse.json({ success: false, error: "This link is invalid." }, { status: 401 });

  const window = await assertFreeWindow(bookingId);
  if (!window.ok) return window.response;

  if (scope === "visit") {
    const result = await cancelBooking(bookingId, { actor: "customer", reason });
    if (!result.ok) return NextResponse.json({ success: false, error: result.error }, { status: result.status });
    return NextResponse.json({ success: true, refundDue: result.refundDue ?? 0 });
  }

  // Series: stop the root generating + cancel future visits, then cancel THIS visit if it's still upcoming.
  const { data: b } = await (createAdminClient() as any).from("bookings").select("parent_booking_id").eq("id", bookingId).maybeSingle();
  const rootId: string = b?.parent_booking_id ?? bookingId;
  const stopped = await stopSeries(rootId, { actor: "customer", reason });
  if (!stopped.ok) return NextResponse.json({ success: false, error: stopped.error }, { status: stopped.status });
  const visit = await cancelBooking(bookingId, { actor: "customer", reason, notifyCustomer: false });
  return NextResponse.json({ success: true, refundDue: visit.ok ? (visit.refundDue ?? 0) : 0 });
}
