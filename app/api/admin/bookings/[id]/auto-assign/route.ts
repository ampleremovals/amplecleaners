import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { autoAssignBooking } from "@/lib/automation/autoAssign";

export const runtime = "nodejs";
export const maxDuration = 30;

/** POST /api/admin/bookings/[id]/auto-assign — run the matcher now. */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const result = await autoAssignBooking(params.id, "admin");
  // A "no match" is an expected outcome, not a server error — the reason is shown to the admin.
  return NextResponse.json({ success: result.assigned, ...result });
}
