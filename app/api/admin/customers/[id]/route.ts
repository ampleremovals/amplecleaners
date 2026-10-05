/* eslint-disable @typescript-eslint/no-explicit-any -- untyped Supabase client */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** GET /api/admin/customers/[id] — contact details, booking history and lifetime spend. */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  if (!z.string().uuid().safeParse(params.id).success) return NextResponse.json({ success: false, error: "Invalid customer" }, { status: 400 });

  const supabase: any = createAdminClient();
  const [{ data: customer }, { data: bookings }, { data: invoices }] = await Promise.all([
    supabase.from("customers").select("id, full_name, email, phone, created_at").eq("id", params.id).maybeSingle(),
    supabase.from("bookings").select("id, reference, service_type, status, clean_date, quote_total, frequency, created_at").eq("customer_id", params.id).order("created_at", { ascending: false }),
    supabase.from("invoices").select("total, status").eq("customer_id", params.id),
  ]);
  if (!customer) return NextResponse.json({ success: false, error: "Customer not found" }, { status: 404 });

  const paid = (invoices ?? []).filter((i: any) => i.status === "paid").reduce((s: number, i: any) => s + Number(i.total), 0);
  const outstanding = (invoices ?? []).filter((i: any) => i.status === "sent").reduce((s: number, i: any) => s + Number(i.total), 0);
  return NextResponse.json({
    success: true,
    customer,
    erased: String(customer.email).startsWith("erased+"),
    bookings: bookings ?? [],
    stats: { bookings: bookings?.length ?? 0, paid, outstanding },
  });
}
