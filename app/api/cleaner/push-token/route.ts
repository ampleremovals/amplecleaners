import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireCleaner } from "@/lib/cleaner-auth";
import { createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const bodySchema = z.object({
  token: z.string().regex(/^Expo(nent)?PushToken\[.+\]$/, "Not an Expo push token"),
  platform: z.enum(["ios", "android"]).optional(),
});

/** POST — register this device for push. Re-registering moves the token to the current cleaner (shared phones). */
export async function POST(req: NextRequest) {
  const auth = await requireCleaner();
  if (!auth.ok) return auth.response;
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, error: "Invalid token" }, { status: 400 });

  const { error } = await createAdminClient()
    .from("cleaner_push_tokens")
    .upsert(
      { token: parsed.data.token, cleaner_id: auth.session.cleanerId, platform: parsed.data.platform ?? null, last_seen_at: new Date().toISOString() },
      { onConflict: "token" },
    );
  if (error) return NextResponse.json({ success: false, error: "Couldn't register device" }, { status: 500 });
  return NextResponse.json({ success: true });
}

/** DELETE — on sign-out, stop pushing this device's token to that cleaner. */
export async function DELETE(req: NextRequest) {
  const auth = await requireCleaner();
  if (!auth.ok) return auth.response;
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, error: "Invalid token" }, { status: 400 });
  await createAdminClient().from("cleaner_push_tokens").delete().eq("token", parsed.data.token).eq("cleaner_id", auth.session.cleanerId);
  return NextResponse.json({ success: true });
}
