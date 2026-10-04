/* eslint-disable @typescript-eslint/no-explicit-any -- untyped Supabase client */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import { verifyQuoteConfirmToken } from "@/lib/tokens";
import { rateLimit } from "@/lib/rate-limit";
import { sendEmailSafe } from "@/lib/notify";
import { emailShell } from "@/lib/email-templates";
import { resendAdminEmail } from "@/lib/resend";

export const runtime = "nodejs";
const TOKEN_EXPIRY_HOURS = 24 * 60;

const bodySchema = z.object({
  bookingId: z.string().uuid(),
  token: z.string().min(10),
  rating: z.number().int().min(1).max(5),
  feedback: z.string().trim().max(1000).optional(),
});

/**
 * POST /api/rate — a customer rates a completed clean. One rating per booking.
 * Recomputes the cleaner's average (which the auto-matcher uses to rank), and
 * a rating of 3 or below emails the admin straight away so a bad clean can be
 * put right while it's still fresh.
 */
export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, "rate", 10, 3600);
  if (limited) return limited;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, error: "Please choose 1 to 5 stars." }, { status: 400 });
  const { bookingId, token, rating, feedback } = parsed.data;
  if (!verifyQuoteConfirmToken(bookingId, token, TOKEN_EXPIRY_HOURS)) {
    return NextResponse.json({ success: false, error: "This link is invalid or has expired." }, { status: 401 });
  }

  const supabase: any = createAdminClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select("reference, assigned_cleaner_id, status, customer:customers(full_name)")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking) return NextResponse.json({ success: false, error: "Booking not found." }, { status: 404 });
  if (!["job_completed", "invoice_sent", "paid"].includes(booking.status)) {
    return NextResponse.json({ success: false, error: "This clean hasn't been completed yet." }, { status: 409 });
  }

  const { error } = await supabase.from("ratings").insert({ booking_id: bookingId, cleaner_id: booking.assigned_cleaner_id, rating, feedback: feedback || null });
  if (error) {
    // uq_ratings_booking: one rating per booking.
    if (error.code === "23505") return NextResponse.json({ success: false, error: "You've already rated this clean — thank you!" }, { status: 409 });
    return NextResponse.json({ success: false, error: "Couldn't save your rating." }, { status: 500 });
  }

  if (booking.assigned_cleaner_id) {
    const { data: all } = await supabase.from("ratings").select("rating").eq("cleaner_id", booking.assigned_cleaner_id);
    if (all?.length) {
      const avg = all.reduce((s: number, r: any) => s + r.rating, 0) / all.length;
      await supabase.from("cleaners").update({ rating_avg: Math.round(avg * 100) / 100 }).eq("id", booking.assigned_cleaner_id);
    }
  }
  await supabase.from("activity_log").insert({ booking_id: bookingId, action: `Customer rated the clean ${rating}/5`, metadata: { rating, feedback: feedback ?? null }, performed_by: "customer" });

  if (rating <= 3) {
    const customer = Array.isArray(booking.customer) ? booking.customer[0] : booking.customer;
    await sendEmailSafe({
      to: resendAdminEmail,
      subject: `⚠️ ${rating}/5 rating — ${booking.reference}`,
      context: "admin: low rating",
      html: emailShell({
        heading: `A ${rating}/5 rating came in`,
        headerColor: "#b45309",
        reference: booking.reference,
        bodyHtml: `<p><strong>${customer?.full_name ?? "A customer"}</strong> rated their clean ${rating}/5.</p>${feedback ? `<p style="background:#fffbeb;border-left:4px solid #b45309;padding:12px;">“${feedback.replace(/</g, "&lt;")}”</p>` : ""}<p>Worth a call to put it right.</p>`,
      }),
    });
  }
  return NextResponse.json({ success: true });
}
