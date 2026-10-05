import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { eraseCustomer } from "@/lib/customers/erase";

export const runtime = "nodejs";
export const maxDuration = 30;

/** POST /api/admin/customers/[id]/erase — anonymise a customer's personal data (right to erasure). Irreversible. */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  if (!z.string().uuid().safeParse(params.id).success) return NextResponse.json({ success: false, error: "Invalid customer" }, { status: 400 });

  const result = await eraseCustomer(params.id, "admin");
  if (!result.ok) return NextResponse.json({ success: false, error: result.error, blockedBy: result.blockedBy }, { status: result.status });
  return NextResponse.json({ success: true, bookings: result.bookings, photosDeleted: result.photosDeleted });
}
