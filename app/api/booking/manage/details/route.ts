/* eslint-disable @typescript-eslint/no-explicit-any -- untyped Supabase client */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { manageBodySchema, tokenOk } from "@/lib/bookings/manage";
import { rateLimit } from "@/lib/rate-limit";
import { FREE_CHANGE_HOURS, isChangeable, isWithinFreeChangeWindow, rescheduleBounds } from "@/lib/bookings/timing";
import { SERVICE_LABELS, type ServiceType } from "@/types";

export const runtime = "nodejs";

/** POST — what the customer's manage page shows. */
export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, "manage-details", 60, 600);
  if (limited) return limited;

  const parsed = manageBodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !tokenOk(parsed.data.bookingId, parsed.data.token)) {
    return NextResponse.json({ success: false, error: "This link is invalid." }, { status: 401 });
  }

  const supabase: any = createAdminClient();
  const { data: b } = await supabase
    .from("bookings")
    .select("reference, status, service_type, clean_date, clean_time, frequency, parent_booking_id, address:addresses(line_1, postcode), customer:customers(full_name), cleaner:cleaners(full_name)")
    .eq("id", parsed.data.bookingId)
    .maybeSingle();
  if (!b) return NextResponse.json({ success: false, error: "Booking not found." }, { status: 404 });

  const address = Array.isArray(b.address) ? b.address[0] : b.address;
  const customer = Array.isArray(b.customer) ? b.customer[0] : b.customer;
  const cleaner = Array.isArray(b.cleaner) ? b.cleaner[0] : b.cleaner;
  const recurring = !!b.frequency && b.frequency !== "one_off";
  return NextResponse.json({
    success: true,
    reference: b.reference,
    status: b.status,
    serviceLabel: SERVICE_LABELS[b.service_type as ServiceType],
    cleanDate: b.clean_date,
    cleanTime: b.clean_time ? String(b.clean_time).slice(0, 5) : null,
    address: address ? `${address.line_1}, ${address.postcode}` : null,
    firstName: String(customer?.full_name ?? "there").split(" ")[0],
    cleanerFirstName: cleaner ? String(cleaner.full_name).split(" ")[0] : null,
    frequency: recurring ? b.frequency : null,
    isVisitInSeries: recurring && !!b.parent_booking_id,
    changeable: isChangeable(b.status),
    withinFreeWindow: isChangeable(b.status) && isWithinFreeChangeWindow(b.clean_date, b.clean_time),
    freeChangeHours: FREE_CHANGE_HOURS,
    bounds: rescheduleBounds(),
  });
}
