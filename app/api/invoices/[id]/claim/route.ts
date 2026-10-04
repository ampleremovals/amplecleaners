/* eslint-disable @typescript-eslint/no-explicit-any -- untyped Supabase client */
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import { verifyInvoiceToken } from "@/lib/tokens";
import { rateLimit } from "@/lib/rate-limit";
import { sendEmailSafe } from "@/lib/notify";
import { resendAdminEmail } from "@/lib/resend";
import { formatCurrency } from "@/lib/utils";

export const runtime = "nodejs";

/**
 * POST /api/invoices/[id]/claim — the customer says they've paid by bank
 * transfer. Never auto-marks paid (a human confirms the money landed); it
 * alerts the admin, who confirms with "Mark paid" on the Invoices page.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const limited = await rateLimit(req, "invoice-claim", 10, 3600);
  if (limited) return limited;

  const { token } = z.object({ token: z.string().min(10) }).catch({ token: "" }).parse(await req.json().catch(() => ({})));
  if (!z.string().uuid().safeParse(params.id).success || !verifyInvoiceToken(params.id, token)) {
    return NextResponse.json({ success: false, error: "This link is invalid." }, { status: 401 });
  }

  const supabase: any = createAdminClient();
  const { data: inv } = await supabase
    .from("invoices")
    .select("invoice_number, total, status, booking_id, customer:customers(full_name), booking:bookings(reference)")
    .eq("id", params.id)
    .maybeSingle();
  if (!inv) return NextResponse.json({ success: false, error: "Invoice not found." }, { status: 404 });
  if (inv.status === "paid") return NextResponse.json({ success: true, alreadyPaid: true });

  const customer = Array.isArray(inv.customer) ? inv.customer[0] : inv.customer;
  const booking = Array.isArray(inv.booking) ? inv.booking[0] : inv.booking;
  await Promise.allSettled([
    supabase.from("activity_log").insert({ booking_id: inv.booking_id, action: `Customer says they paid ${inv.invoice_number} by bank transfer`, performed_by: "customer" }),
    sendEmailSafe({
      to: resendAdminEmail,
      subject: `💷 Transfer claimed — ${inv.invoice_number} (${booking?.reference ?? ""})`,
      context: "admin: invoice transfer claimed",
      html: `<p><strong>${customer?.full_name ?? "A customer"}</strong> says they've paid <strong>${formatCurrency(Number(inv.total))}</strong> for invoice <strong>${inv.invoice_number}</strong>.</p><p>Check the bank account, then press <em>Mark paid</em> on the Invoices page.</p>`,
    }),
  ]);
  return NextResponse.json({ success: true });
}
