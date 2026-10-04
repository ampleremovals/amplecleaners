import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { defaultTasks } from "@/lib/tasks-template";
import { generateBookingReference, normaliseUKPhone } from "@/lib/utils";
import { DEPOSIT_PERCENTAGE } from "@/lib/deposit";
import { REGULAR_CLEANING_MIN_HOURS, REGULAR_CLEANING_HOURLY_RATE, regularCleaningPrice } from "@/lib/pricing";
import type { ServiceType } from "@/types";

export const runtime = "nodejs";

const SERVICE_TYPES: ServiceType[] = [
  "regular_cleaning", "deep_cleaning", "end_of_tenancy", "office_cleaning", "after_builders",
];

const bodySchema = z.object({
  serviceType: z.enum(SERVICE_TYPES as [ServiceType, ...ServiceType[]]),
  fullName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(8),
  propertyType: z.enum(["flat", "house", "studio", "office", "other"]),
  bedrooms: z.number().int().min(0).max(10).optional(),
  bathrooms: z.number().int().min(0).max(10).optional(),
  frequency: z.enum(["one_off", "weekly", "fortnightly", "monthly"]).optional(),
  hours: z.number().min(REGULAR_CLEANING_MIN_HOURS).optional(),
  line1: z.string().min(2),
  line2: z.string().optional(),
  city: z.string().optional(),
  postcode: z.string().min(3),
  cleanDate: z.string().optional(),
  isFlexibleDate: z.boolean().optional(),
  specialInstructions: z.string().max(2000).optional(),
});

/**
 * POST /api/bookings — one shared endpoint for all 5 cleaning services (the
 * schema is already generic, so unlike Ample Removals there's no need for a
 * separate route per service). Creates/reuses the customer, the address, and
 * the booking row; logs the audit trail; returns the reference. Admin builds
 * and sends the quote afterwards (see app/(admin)/admin/bookings).
 */
export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, "booking", 8, 600);
  if (limited) return limited;
  const supabase = createAdminClient();
  try {
    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
    }
    const d = parsed.data;
    const phone = normaliseUKPhone(d.phone);

    // Reuse an existing customer by email if one exists, else create one.
    const { data: existingCustomer } = await supabase
      .from("customers").select("id").ilike("email", d.email).maybeSingle();
    const customerId = existingCustomer?.id ?? (
      await supabase.from("customers").insert({ full_name: d.fullName, email: d.email, phone }).select("id").single()
    ).data?.id;
    if (!customerId) throw new Error("Could not create customer");

    const { data: address, error: addrErr } = await supabase
      .from("addresses")
      .insert({ line_1: d.line1, line_2: d.line2 ?? null, city: d.city ?? null, postcode: d.postcode.toUpperCase() })
      .select("id")
      .single();
    if (addrErr || !address) throw new Error(`Address insert failed: ${addrErr?.message}`);

    const reference = generateBookingReference(d.serviceType);

    // Regular Cleaning has a deterministic, advertised rate (£15/hr, 3hr
    // minimum) — compute the quote immediately instead of waiting on the
    // admin, so the customer sees a real price right away. The other 4
    // services vary too much by property to price automatically.
    const isRegular = d.serviceType === "regular_cleaning";
    const hours = isRegular ? Math.max(REGULAR_CLEANING_MIN_HOURS, d.hours ?? REGULAR_CLEANING_MIN_HOURS) : null;
    const total = isRegular && hours ? regularCleaningPrice(hours) : null;
    const lineItems = isRegular && hours
      ? [{ description: `Regular cleaning — ${hours} hours @ £${REGULAR_CLEANING_HOURLY_RATE}/hr`, quantity: hours, unit_price: REGULAR_CLEANING_HOURLY_RATE, total }]
      : [];

    const { data: booking, error: bookingErr } = await supabase
      .from("bookings")
      .insert({
        reference,
        service_type: d.serviceType,
        customer_id: customerId,
        address_id: address.id,
        property_type: d.propertyType,
        bedrooms: d.bedrooms ?? null,
        bathrooms: d.bathrooms ?? null,
        frequency: isRegular ? (d.frequency ?? "weekly") : "one_off",
        clean_date: d.isFlexibleDate ? null : (d.cleanDate || null),
        is_flexible_date: d.isFlexibleDate ?? false,
        special_instructions: d.specialInstructions ?? null,
        status: "inquiry",
        source: "website",
        tasks: defaultTasks(d.serviceType),
        quote_line_items: lineItems,
        quote_subtotal: total,
        quote_total: total,
        // Stamped at creation — see lib/deposit.ts (Lesson 18 from Ample
        // Removals: a rate that can change over time belongs on the row).
        deposit_percentage: DEPOSIT_PERCENTAGE,
      })
      .select("id, reference")
      .single();
    if (bookingErr || !booking) throw new Error(`Booking insert failed: ${bookingErr?.message}`);

    await Promise.allSettled([
      supabase.from("status_history").insert({
        booking_id: booking.id, previous_status: null, new_status: "inquiry", changed_by: "customer",
      }),
      supabase.from("activity_log").insert({
        booking_id: booking.id, action: "booking_created", metadata: { source: "website", service_type: d.serviceType }, performed_by: "customer",
      }),
    ]);

    return NextResponse.json({ success: true, reference: booking.reference, total });
  } catch (err) {
    try {
      await supabase.from("server_logs").insert({
        level: "error", message: "booking creation failed", metadata: { error: String(err) },
      });
    } catch { /* logging must never mask the original error */ }
    return NextResponse.json({ success: false, error: "Something went wrong — please try again or call us." }, { status: 500 });
  }
}
