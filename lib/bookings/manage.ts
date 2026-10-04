import { z } from "zod";
import { NextResponse } from "next/server";
import { verifyBookingToken } from "@/lib/tokens";
import { isWithinFreeChangeWindow } from "@/lib/bookings/timing";
import { createAdminClient } from "@/lib/supabase/server";

export const manageBodySchema = z.object({ bookingId: z.string().uuid(), token: z.string().min(10) });

export const INVALID_LINK = NextResponse.json({ success: false, error: "This link is invalid." }, { status: 401 });

export function tokenOk(bookingId: string, token: string): boolean {
  return verifyBookingToken(bookingId, token);
}

/** Server-side enforcement of the 48-hour rule (the UI hides buttons, but never trust the UI). */
export async function assertFreeWindow(bookingId: string): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  const { data } = await createAdminClient().from("bookings").select("clean_date, clean_time").eq("id", bookingId).maybeSingle();
  if (!data) return { ok: false, response: NextResponse.json({ success: false, error: "Booking not found." }, { status: 404 }) };
  if (!isWithinFreeChangeWindow(data.clean_date, data.clean_time)) {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: "This clean is less than 48 hours away, so we can't change it online. Please call us on 0333 000 0000 and we'll help." },
        { status: 409 },
      ),
    };
  }
  return { ok: true };
}
