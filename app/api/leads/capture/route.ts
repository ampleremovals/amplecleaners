/* eslint-disable @typescript-eslint/no-explicit-any -- untyped Supabase client */
import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { SERVICE_TYPES } from "@/lib/bookings/create";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  fullName: z.string().trim().max(120).optional(),
  phone: z.string().trim().max(40).optional(),
  serviceType: z.enum(SERVICE_TYPES as [string, ...string[]]),
});

/**
 * POST /api/leads/capture — the booking form calls this once the visitor has typed a valid name and email,
 * so a reminder can follow if they never submit. The form tells them this beside the email box. A finished
 * booking marks the lead converted (lib/bookings/create.ts), and the sender re-checks that before every send.
 * Always answers 200: it must never get in the way of someone filling in the form.
 */
export async function POST(req: Request) {
  const limited = await rateLimit(req, "lead-capture", 12, 3600);
  if (limited) return limited;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: true });
  const { email, fullName, phone, serviceType } = parsed.data;
  try {
    const db: any = createAdminClient();
    const now = new Date().toISOString();
    const { data: existing } = await db.from("abandoned_leads").select("id, converted_at").eq("email", email).maybeSingle();
    if (!existing) {
      await db.from("abandoned_leads").insert({ email, full_name: fullName || null, phone: phone || null, service_type: serviceType });
    } else if (existing.converted_at) {
      // they came back for another booking: a fresh cycle
      await db.from("abandoned_leads").update({ full_name: fullName || null, phone: phone || null, service_type: serviceType, created_at: now, updated_at: now, converted_at: null }).eq("id", existing.id);
    } else {
      await db.from("abandoned_leads").update({ full_name: fullName || null, phone: phone || null, service_type: serviceType, updated_at: now }).eq("id", existing.id);
    }
  } catch { /* best effort */ }
  return NextResponse.json({ success: true });
}
