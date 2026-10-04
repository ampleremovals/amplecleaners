/* eslint-disable @typescript-eslint/no-explicit-any -- untyped Supabase client */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import { verifyQuoteConfirmToken } from "@/lib/tokens";
import { rateLimit } from "@/lib/rate-limit";
import { SERVICE_LABELS, type ServiceType } from "@/types";

export const runtime = "nodejs";
const TOKEN_EXPIRY_HOURS = 24 * 60;

/** POST — what the public rating page shows (and whether it's already been rated). */
export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, "rate-details", 60, 600);
  if (limited) return limited;

  const parsed = z.object({ bookingId: z.string().uuid(), token: z.string().min(10) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success || !verifyQuoteConfirmToken(parsed.data.bookingId, parsed.data.token, TOKEN_EXPIRY_HOURS)) {
    return NextResponse.json({ success: false, error: "This link is invalid or has expired." }, { status: 401 });
  }

  const supabase: any = createAdminClient();
  const [{ data: booking }, { data: existing }] = await Promise.all([
    supabase.from("bookings").select("service_type, clean_date, customer:customers(full_name), cleaner:cleaners(full_name)").eq("id", parsed.data.bookingId).maybeSingle(),
    supabase.from("ratings").select("rating").eq("booking_id", parsed.data.bookingId).maybeSingle(),
  ]);
  if (!booking) return NextResponse.json({ success: false, error: "Booking not found." }, { status: 404 });

  const customer = Array.isArray(booking.customer) ? booking.customer[0] : booking.customer;
  const cleaner = Array.isArray(booking.cleaner) ? booking.cleaner[0] : booking.cleaner;
  return NextResponse.json({
    success: true,
    firstName: String(customer?.full_name ?? "there").split(" ")[0],
    cleanerFirstName: cleaner ? String(cleaner.full_name).split(" ")[0] : null,
    serviceLabel: SERVICE_LABELS[booking.service_type as ServiceType],
    alreadyRated: !!existing,
  });
}
