/* eslint-disable @typescript-eslint/no-explicit-any -- untyped Supabase client */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/server";
import { sendBalanceInvoiceMessages } from "@/lib/bookings/invoiceDelivery";

export const runtime = "nodejs";
export const maxDuration = 30;

/** POST /api/admin/invoices/[id]/resend — re-send an unpaid balance invoice (email + SMS + WhatsApp). */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  if (!z.string().uuid().safeParse(params.id).success) return NextResponse.json({ success: false, error: "Invalid invoice" }, { status: 400 });

  const supabase: any = createAdminClient();
  const { data: inv } = await supabase
    .from("invoices")
    .select("id, invoice_number, type, status, total, due_date, booking_id, customer:customers(full_name, email, phone), booking:bookings(reference)")
    .eq("id", params.id)
    .maybeSingle();
  if (!inv) return NextResponse.json({ success: false, error: "Invoice not found" }, { status: 404 });
  if (inv.status === "paid") return NextResponse.json({ success: false, error: "Already paid" }, { status: 409 });
  if (inv.type === "deposit") return NextResponse.json({ success: false, error: "Deposit invoices are re-sent from the booking (resend the quote)" }, { status: 400 });

  const customer = Array.isArray(inv.customer) ? inv.customer[0] : inv.customer;
  const booking = Array.isArray(inv.booking) ? inv.booking[0] : inv.booking;
  if (!customer || !booking) return NextResponse.json({ success: false, error: "Invoice is missing its customer" }, { status: 422 });

  await sendBalanceInvoiceMessages({
    invoiceId: inv.id, invoiceNumber: inv.invoice_number, reference: booking.reference,
    firstName: String(customer.full_name).split(" ")[0], email: customer.email, phone: customer.phone,
    total: Number(inv.total), dueDate: inv.due_date, kind: inv.type,
  });
  await supabase.from("activity_log").insert({ booking_id: inv.booking_id, action: `Invoice ${inv.invoice_number} re-sent`, performed_by: "admin" });
  return NextResponse.json({ success: true });
}
