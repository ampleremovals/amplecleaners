import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import { isChangeable } from "@/lib/bookings/timing";
import { rescheduleBooking } from "@/lib/bookings/changes";

/** GET /api/admin/bookings/[id] — full booking detail for the CRM record view. */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const supabase = createAdminClient();
  const { data: booking, error } = await supabase
    .from("bookings")
    .select(`
      *,
      customer:customers(id, full_name, email, phone),
      address:addresses(id, line_1, line_2, city, postcode),
      cleaner:cleaners(id, full_name, phone)
    `)
    .eq("id", params.id)
    .maybeSingle();
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  if (!booking) return NextResponse.json({ success: false, error: "Booking not found" }, { status: 404 });

  const [{ data: statusHistory }, { data: activityLog }, { data: invoices }] = await Promise.all([
    supabase.from("status_history").select("*").eq("booking_id", params.id).order("created_at", { ascending: false }),
    supabase.from("activity_log").select("*").eq("booking_id", params.id).order("created_at", { ascending: false }),
    supabase.from("invoices").select("*").eq("booking_id", params.id).order("created_at", { ascending: false }),
  ]);

  return NextResponse.json({
    success: true,
    booking,
    statusHistory: statusHistory ?? [],
    activityLog: activityLog ?? [],
    invoices: invoices ?? [],
  });
}

const editSchema = z.object({
  cleanDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  cleanTime: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  specialInstructions: z.string().max(2000).nullable().optional(),
  propertyType: z.enum(["flat", "house", "studio", "office", "other"]).optional(),
  bedrooms: z.number().int().min(0).max(20).nullable().optional(),
  bathrooms: z.number().int().min(0).max(20).nullable().optional(),
  frequency: z.enum(["one_off", "weekly", "fortnightly", "monthly"]).optional(),
  address: z.object({ line1: z.string().trim().min(2), line2: z.string().nullable().optional(), city: z.string().nullable().optional(), postcode: z.string().trim().min(3) }).optional(),
  /** Tell the customer when the date/time changes (default yes). */
  notifyCustomer: z.boolean().optional(),
});

/**
 * PATCH /api/admin/bookings/[id] — edit a booking's details. A date/time or
 * postcode change releases the assigned cleaner (who is told) and re-runs the
 * matcher, exactly as a customer reschedule does.
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const parsed = editSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message ?? "Invalid details" }, { status: 400 });
  const d = parsed.data;

  const supabase = createAdminClient();
  const { data: b } = await supabase
    .from("bookings")
    .select("id, status, clean_date, clean_time, address_id, assigned_cleaner_id, address:addresses(postcode)")
    .eq("id", params.id)
    .maybeSingle();
  if (!b) return NextResponse.json({ success: false, error: "Booking not found" }, { status: 404 });
  const currentPostcode = (Array.isArray(b.address) ? b.address[0] : b.address)?.postcode as string | undefined;

  const dateChanged = d.cleanDate !== undefined && d.cleanDate !== null && (d.cleanDate !== b.clean_date || (d.cleanTime !== undefined && (d.cleanTime ?? null) !== (b.clean_time ? String(b.clean_time).slice(0, 5) : null)));
  const postcodeChanged = !!d.address && d.address.postcode.toUpperCase() !== (currentPostcode ?? "").toUpperCase();
  if ((dateChanged || postcodeChanged) && !isChangeable(b.status)) {
    return NextResponse.json({ success: false, error: "The date, time or postcode can't be changed once the job has started or finished." }, { status: 409 });
  }

  const patch: Record<string, unknown> = {};
  if (d.specialInstructions !== undefined) patch.special_instructions = d.specialInstructions;
  if (d.propertyType !== undefined) patch.property_type = d.propertyType;
  if (d.bedrooms !== undefined) patch.bedrooms = d.bedrooms;
  if (d.bathrooms !== undefined) patch.bathrooms = d.bathrooms;
  if (d.frequency !== undefined) patch.frequency = d.frequency;
  if (d.cleanDate === null) { patch.clean_date = null; patch.is_flexible_date = true; }
  if (Object.keys(patch).length) {
    const { error } = await supabase.from("bookings").update(patch).eq("id", params.id);
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
  if (d.address && b.address_id) {
    const { error } = await supabase.from("addresses").update({ line_1: d.address.line1, line_2: d.address.line2 ?? null, city: d.address.city ?? null, postcode: d.address.postcode.toUpperCase() }).eq("id", b.address_id);
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
  await supabase.from("activity_log").insert({ booking_id: params.id, action: "Booking details edited by admin", metadata: { fields: Object.keys(d).filter((k) => k !== "notifyCustomer") }, performed_by: "admin" });

  // Date/time (or a postcode that may break coverage) → release + re-match through the shared engine.
  const effectiveDate = d.cleanDate ?? b.clean_date;
  if ((dateChanged || postcodeChanged) && effectiveDate) {
    const result = await rescheduleBooking(params.id, { cleanDate: effectiveDate, cleanTime: d.cleanTime }, { actor: "admin", notifyCustomer: dateChanged && d.notifyCustomer !== false });
    if (!result.ok) return NextResponse.json({ success: false, error: result.error }, { status: result.status });
    return NextResponse.json({ success: true, reassigned: result.reassigned ?? false });
  }
  return NextResponse.json({ success: true });
}
