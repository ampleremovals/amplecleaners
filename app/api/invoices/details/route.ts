/* eslint-disable @typescript-eslint/no-explicit-any -- untyped Supabase client */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import { verifyInvoiceToken } from "@/lib/tokens";
import { rateLimit } from "@/lib/rate-limit";
import { SERVICE_LABELS, type ServiceType } from "@/types";

export const runtime = "nodejs";

const bodySchema = z.object({ invoiceId: z.string().uuid(), token: z.string().min(10) });

/** POST /api/invoices/details — what the public pay page shows. Token-guarded. */
export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, "invoice-details", 60, 600);
  if (limited) return limited;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !verifyInvoiceToken(parsed.data.invoiceId, parsed.data.token)) {
    return NextResponse.json({ success: false, error: "This link is invalid." }, { status: 401 });
  }

  const supabase: any = createAdminClient();
  const { data: inv } = await supabase
    .from("invoices")
    .select("invoice_number, type, status, total, due_date, paid_at, customer:customers(full_name), booking:bookings(reference, service_type, clean_date)")
    .eq("id", parsed.data.invoiceId)
    .maybeSingle();
  if (!inv) return NextResponse.json({ success: false, error: "Invoice not found." }, { status: 404 });

  const customer = Array.isArray(inv.customer) ? inv.customer[0] : inv.customer;
  const booking = Array.isArray(inv.booking) ? inv.booking[0] : inv.booking;
  return NextResponse.json({
    success: true,
    invoiceNumber: inv.invoice_number,
    type: inv.type,
    status: inv.status,
    total: Number(inv.total),
    dueDate: inv.due_date,
    paidAt: inv.paid_at,
    firstName: String(customer?.full_name ?? "there").split(" ")[0],
    reference: booking?.reference ?? "",
    serviceLabel: booking ? SERVICE_LABELS[booking.service_type as ServiceType] : "",
    cleanDate: booking?.clean_date ?? null,
  });
}
