import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { settleInvoice } from "@/lib/bookings/settle";

export const runtime = "nodejs";
export const maxDuration = 30;

/** POST /api/admin/invoices/[id]/mark-paid — a bank transfer has landed. */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  if (!z.string().uuid().safeParse(params.id).success) return NextResponse.json({ success: false, error: "Invalid invoice" }, { status: 400 });

  const result = await settleInvoice(params.id, { method: "bank_transfer", actor: "admin" });
  if (!result.settled) return NextResponse.json({ success: false, error: result.reason }, { status: 409 });
  return NextResponse.json({ success: true });
}
