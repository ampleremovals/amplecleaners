import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { funnel } from "@/lib/email/stats";

export const dynamic = "force-dynamic";

/** GET /api/admin/email/funnel?days=30 — enquiry → quote → deposit → clean → paid, plus what email recovered. */
export async function GET(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const days = [7, 30, 90, 365].includes(Number(new URL(req.url).searchParams.get("days"))) ? Number(new URL(req.url).searchParams.get("days")) : 30;
  return NextResponse.json({ success: true, ...(await funnel(days)) });
}
