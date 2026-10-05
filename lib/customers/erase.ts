/* eslint-disable @typescript-eslint/no-explicit-any -- untyped Supabase client */
import { createAdminClient } from "@/lib/supabase/server";

/** A booking in one of these statuses is finished, so the customer's data is no longer needed to deliver anything. */
const FINAL_STATUSES = ["paid", "cancelled", "bad_lead", "not_a_good_fit"];

export type EraseResult =
  | { ok: true; bookings: number; photosDeleted: number }
  | { ok: false; error: string; status: number; blockedBy?: string[] };

/**
 * Honours a UK-GDPR erasure request: anonymises the customer's personal data
 * (name, email, phone, address, notes, free-text feedback) and deletes the
 * photos taken inside their home — while KEEPING invoices, amounts and dates,
 * which UK tax law requires us to retain for six years. Refuses while any
 * booking is still live or unpaid, since we'd need the data to deliver it.
 */
export async function eraseCustomer(customerId: string, actor: string): Promise<EraseResult> {
  const supabase: any = createAdminClient();
  const { data: customer } = await supabase.from("customers").select("id, email").eq("id", customerId).maybeSingle();
  if (!customer) return { ok: false, error: "Customer not found", status: 404 };
  if (String(customer.email).startsWith("erased+")) return { ok: false, error: "This customer's data has already been erased.", status: 409 };

  const { data: bookings } = await supabase.from("bookings").select("id, reference, status, address_id, before_photos, after_photos").eq("customer_id", customerId);
  const live = (bookings ?? []).filter((b: any) => !FINAL_STATUSES.includes(b.status));
  if (live.length) {
    return { ok: false, error: "This customer still has bookings in progress or unpaid. Finish or cancel those first.", status: 409, blockedBy: live.map((b: any) => b.reference) };
  }

  const bookingIds: string[] = (bookings ?? []).map((b: any) => b.id);
  const addressIds: string[] = (bookings ?? []).map((b: any) => b.address_id).filter(Boolean);
  const photoPaths: string[] = (bookings ?? []).flatMap((b: any) => [...(b.before_photos ?? []), ...(b.after_photos ?? [])]);

  if (photoPaths.length) await supabase.storage.from("job-photos").remove(photoPaths);

  await supabase.from("customers").update({ full_name: "Erased customer", email: `erased+${customerId.slice(0, 8)}@invalid.local`, phone: "erased" }).eq("id", customerId);

  if (addressIds.length) {
    const { data: addrs } = await supabase.from("addresses").select("id, postcode").in("id", addressIds);
    for (const a of addrs ?? []) {
      // Keep only the outward code (e.g. "SW1A"): useful for area stats, not identifying.
      await supabase.from("addresses").update({ line_1: "Erased", line_2: null, city: null, postcode: String(a.postcode).split(" ")[0].toUpperCase() }).eq("id", a.id);
    }
  }
  if (bookingIds.length) {
    await supabase.from("bookings").update({
      special_instructions: null, description: null, before_photos: [], after_photos: [],
      utm_source: null, utm_medium: null, utm_campaign: null, utm_term: null, utm_content: null, gclid: null, fbclid: null, referrer: null, landing_page: null,
      clock_in_lat: null, clock_in_lng: null, clock_out_lat: null, clock_out_lng: null,
    }).in("id", bookingIds);
    await supabase.from("ratings").update({ feedback: null }).in("booking_id", bookingIds);
    await supabase.from("activity_log").insert(bookingIds.map((id) => ({ booking_id: id, action: "Customer personal data erased on request", performed_by: actor })));
  }
  return { ok: true, bookings: bookingIds.length, photosDeleted: photoPaths.length };
}
