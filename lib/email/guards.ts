/* eslint-disable @typescript-eslint/no-explicit-any -- untyped Supabase client */
import { createAdminClient } from "@/lib/supabase/server";
import type { Guard } from "@/lib/email/outbox";

export const DEAD_STATUSES = ["cancelled", "bad_lead", "not_a_good_fit"];

/** Re-checks the world at the moment of sending: a lot can change between scheduling and sending. */
export async function checkGuard(g: Guard, bookingId: string | null, toEmail?: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  const db: any = createAdminClient();
  if (g.statusIn) {
    if (!bookingId) return { ok: false, reason: "no booking" };
    const { data } = await db.from("bookings").select("status").eq("id", bookingId).maybeSingle();
    if (!data || !g.statusIn.includes(data.status)) return { ok: false, reason: `booking is now ${data?.status ?? "gone"}` };
  }
  if (g.notRated) {
    if (!bookingId) return { ok: false, reason: "no booking" };
    const { data } = await db.from("ratings").select("id").eq("booking_id", bookingId).maybeSingle();
    if (data) return { ok: false, reason: "already rated" };
  }
  if (g.leadId) {
    const { data: lead } = await db.from("abandoned_leads").select("email, created_at, converted_at").eq("id", g.leadId).maybeSingle();
    if (!lead || lead.converted_at) return { ok: false, reason: "booking completed" };
    const { data: cust } = await db.from("customers").select("id").ilike("email", lead.email).maybeSingle();
    if (cust) {
      const { data: b } = await db.from("bookings").select("id").eq("customer_id", cust.id).gte("created_at", lead.created_at).limit(1);
      if (b?.length) {
        await db.from("abandoned_leads").update({ converted_at: new Date().toISOString() }).eq("id", g.leadId);
        return { ok: false, reason: "booking completed" };
      }
    }
  }
  if (g.quietForHours && toEmail) {
    const since = new Date(Date.now() - g.quietForHours * 3_600_000).toISOString();
    const { data } = await db.from("email_outbox").select("id").ilike("to_email", toEmail).eq("status", "sent").gte("sent_at", since).limit(1);
    if (data?.length) return { ok: false, reason: `already emailed within ${g.quietForHours} hours` };
  }
  if (g.noNewBooking) {
    const n = g.noNewBooking;
    let q = db.from("bookings").select("id").eq("customer_id", n.customerId).not("status", "in", `(${DEAD_STATUSES.join(",")})`).or(`created_at.gte.${n.after},clean_date.gt.${n.afterDate}`).limit(1);
    if (n.excludeBookingId) q = q.neq("id", n.excludeBookingId);
    const { data } = await q;
    if (data?.length) return { ok: false, reason: "customer has booked again" };
  }
  return { ok: true };
}
