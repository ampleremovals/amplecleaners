import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/server";
import type { QuoteLineItem } from "@/types";

/**
 * PATCH /api/admin/bookings/[id]/quote — save the quote (single price, no
 * Standard/Premium tiers — cleaning jobs are priced per visit). Does NOT
 * send anything; sending is a separate step (POST .../quote/send, Phase 3)
 * so the admin can review before it goes out, same separation of concerns
 * as Ample Removals' save-vs-send split.
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null) as {
    lineItems?: QuoteLineItem[];
    vatRate?: number;
    depositRequired?: boolean;
    validUntil?: string;
    notes?: string;
  } | null;

  if (!body?.lineItems?.length) {
    return NextResponse.json({ success: false, error: "Add at least one line item" }, { status: 400 });
  }

  const subtotal = Math.round(body.lineItems.reduce((sum, l) => sum + (Number(l.total) || 0), 0) * 100) / 100;
  const vatRate = body.vatRate ?? 0;
  const vatAmount = Math.round(subtotal * (vatRate / 100) * 100) / 100;
  const total = Math.round((subtotal + vatAmount) * 100) / 100;

  if (total <= 0) {
    return NextResponse.json({ success: false, error: "Quote total must be greater than zero" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("bookings")
    .update({
      quote_line_items: body.lineItems,
      quote_subtotal: subtotal,
      quote_vat_rate: vatRate,
      quote_vat_amount: vatAmount,
      quote_total: total,
      quote_valid_until: body.validUntil ?? null,
      quote_notes: body.notes ?? null,
      deposit_required: body.depositRequired ?? true,
    })
    .eq("id", params.id);
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

  await supabase.from("activity_log").insert({
    booking_id: params.id,
    action: `Quote saved: ${new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(total)}`,
    metadata: { total },
    performed_by: "admin",
  });

  return NextResponse.json({ success: true, total });
}
