/* eslint-disable @typescript-eslint/no-explicit-any -- untyped Supabase client */
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/server";
import { suppress } from "@/lib/email/suppression";

export const dynamic = "force-dynamic";

/** GET — everyone we must not email (unsubscribed, bounced, complained). */
export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { data } = await (createAdminClient() as any).from("email_suppressions").select("*").order("created_at", { ascending: false }).limit(500);
  return NextResponse.json({ success: true, rows: data ?? [] });
}

const addSchema = z.object({ email: z.string().trim().toLowerCase().email().max(200) });

/** POST — add an address by hand (e.g. someone asked to stop by phone). Marketing only. */
export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const parsed = addSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, error: "Enter a valid email address" }, { status: 400 });
  await suppress(parsed.data.email, "marketing", "added by admin");
  return NextResponse.json({ success: true });
}

/** DELETE ?email= — lift an unsubscribe the customer asked us to reverse. Bounces and spam complaints can't be lifted here. */
export async function DELETE(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const email = (new URL(req.url).searchParams.get("email") ?? "").trim().toLowerCase();
  const { data } = await (createAdminClient() as any).from("email_suppressions").delete().eq("email", email).eq("scope", "marketing").select("email");
  if (!data?.length) return NextResponse.json({ success: false, error: "Only unsubscribes can be lifted. Bounced or complained addresses stay blocked." }, { status: 400 });
  return NextResponse.json({ success: true });
}
