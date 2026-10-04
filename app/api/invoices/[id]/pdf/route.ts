/* eslint-disable @typescript-eslint/no-explicit-any -- untyped Supabase client */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin-auth";
import { verifyInvoiceToken } from "@/lib/tokens";
import { rateLimit } from "@/lib/rate-limit";
import { renderInvoicePdf } from "@/lib/pdf/InvoiceDocument";
import { SERVICE_LABELS, type ServiceType } from "@/types";
import { BANK_DETAILS, BANK_DETAILS_CONFIGURED } from "@/lib/deposit";

export const runtime = "nodejs";
export const maxDuration = 30;

/** Best-effort brand logo for the PDF header; falls back to the text wordmark. */
async function fetchLogo(): Promise<Buffer | null> {
  try {
    const site = process.env.NEXT_PUBLIC_SITE_URL;
    if (!site) return null;
    const res = await fetch(`${site}/logo-full.png`, { signal: AbortSignal.timeout(3000) });
    return res.ok ? Buffer.from(await res.arrayBuffer()) : null;
  } catch {
    return null;
  }
}

/**
 * GET /api/invoices/[id]/pdf — the invoice as a PDF. Authorised by EITHER the
 * invoice's signed link token (customers, from email) OR an admin session.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!z.string().uuid().safeParse(params.id).success) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const token = new URL(req.url).searchParams.get("token") ?? "";
  if (!verifyInvoiceToken(params.id, token)) {
    const admin = await requireAdmin();
    if (!admin.ok) return NextResponse.json({ error: "This link is invalid." }, { status: 401 });
  } else {
    const limited = await rateLimit(req, "invoice-pdf", 30, 600);
    if (limited) return limited;
  }

  const supabase: any = createAdminClient();
  const { data: inv } = await supabase
    .from("invoices")
    .select("invoice_number, created_at, due_date, paid_at, line_items, subtotal, vat_rate, vat_amount, total, customer:customers(full_name, email), booking:bookings(reference, service_type)")
    .eq("id", params.id)
    .maybeSingle();
  if (!inv) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [{ data: settings }, logo] = await Promise.all([supabase.from("settings").select("company_name, company_address, company_email, company_phone").eq("id", 1).maybeSingle(), fetchLogo()]);
  const customer = Array.isArray(inv.customer) ? inv.customer[0] : inv.customer;
  const booking = Array.isArray(inv.booking) ? inv.booking[0] : inv.booking;

  const pdf = await renderInvoicePdf({
    invoiceNumber: inv.invoice_number,
    issuedAt: inv.created_at,
    dueDate: inv.due_date,
    paidAt: inv.paid_at,
    lineItems: inv.line_items ?? [],
    subtotal: Number(inv.subtotal), vatRate: Number(inv.vat_rate ?? 0), vatAmount: Number(inv.vat_amount ?? 0), total: Number(inv.total),
    reference: booking ? `${booking.reference} · ${SERVICE_LABELS[booking.service_type as ServiceType] ?? ""}` : "—",
    customerName: customer?.full_name ?? "Customer",
    customerEmail: customer?.email ?? null,
    company: {
      name: settings?.company_name ?? "Ample Cleaners",
      address: settings?.company_address ?? null,
      email: settings?.company_email ?? "hello@amplecleaners.com",
      phone: settings?.company_phone ?? "0333 000 0000",
    },
    bank: BANK_DETAILS_CONFIGURED ? BANK_DETAILS : null,
    logo,
  });

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${inv.invoice_number}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
