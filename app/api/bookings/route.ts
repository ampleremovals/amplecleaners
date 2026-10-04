import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { afterBookingCreated, bookingInputSchema, createBooking } from "@/lib/bookings/create";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * POST /api/bookings — the public booking form, one endpoint for all 5
 * services. Creates the booking, then runs the instant automation: admin
 * alert + (for priced bookings) the quote and deposit link straight to the
 * customer. `quotePath` lets the confirmation page offer "pay your deposit now".
 */
export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, "booking", 8, 600);
  if (limited) return limited;

  try {
    const parsed = bookingInputSchema.omit({ quoteTotal: true, cleanTime: true }).safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
    }
    const booking = await createBooking(parsed.data, "website", "customer");
    const { quotePath } = await afterBookingCreated(booking.id, { alertAdmin: true, messageCustomer: true });
    return NextResponse.json({ success: true, reference: booking.reference, total: booking.total, quotePath });
  } catch (err) {
    try {
      await createAdminClient().from("server_logs").insert({ level: "error", message: "booking creation failed", metadata: { error: String(err) } });
    } catch { /* logging must never mask the original error */ }
    return NextResponse.json({ success: false, error: "Something went wrong — please try again or call us." }, { status: 500 });
  }
}
