/* eslint-disable @typescript-eslint/no-explicit-any -- untyped Supabase client */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/server";
import { todayInLondon } from "@/lib/cleaner-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/admin/invoices?status=&q= — invoices with customer + booking, plus money-at-a-glance totals. */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const supabase: any = createAdminClient();
  const params = new URL(req.url).searchParams;
  const status = params.get("status");
  const q = params.get("q")?.trim().toLowerCase();

  const { data, error } = await supabase
    .from("invoices")
    .select("id, invoice_number, type, status, total, due_date, paid_at, sent_at, created_at, reminder_count, booking_id, customer:customers(full_name, email), booking:bookings(reference)")
    .neq("status", "draft")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

  const today = todayInLondon();
  const monthStart = `${today.slice(0, 7)}-01`;
  const rows = (data ?? []).map((i: any) => {
    const customer = Array.isArray(i.customer) ? i.customer[0] : i.customer;
    const booking = Array.isArray(i.booking) ? i.booking[0] : i.booking;
    return {
      id: i.id, invoiceNumber: i.invoice_number, type: i.type, status: i.status, total: Number(i.total),
      dueDate: i.due_date, paidAt: i.paid_at, createdAt: i.created_at, reminderCount: i.reminder_count,
      bookingId: i.booking_id, reference: booking?.reference ?? null,
      customerName: customer?.full_name ?? "—", customerEmail: customer?.email ?? null,
      overdue: i.status === "sent" && !!i.due_date && i.due_date < today,
    };
  });

  const totals = {
    outstanding: rows.filter((r: any) => r.status === "sent").reduce((s: number, r: any) => s + r.total, 0),
    overdue: rows.filter((r: any) => r.overdue).reduce((s: number, r: any) => s + r.total, 0),
    paidThisMonth: rows.filter((r: any) => r.status === "paid" && r.paidAt && r.paidAt.slice(0, 10) >= monthStart).reduce((s: number, r: any) => s + r.total, 0),
  };

  const filtered = rows.filter((r: any) => {
    if (status === "overdue" ? !r.overdue : status && status !== "all" && r.status !== status) return false;
    if (q && !`${r.invoiceNumber} ${r.customerName} ${r.reference ?? ""}`.toLowerCase().includes(q)) return false;
    return true;
  });
  return NextResponse.json({ success: true, invoices: filtered, totals });
}
