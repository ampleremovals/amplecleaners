import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export interface CleanerSession {
  userId: string;
  cleanerId: string;
  fullName: string;
}

/**
 * Verifies the caller is an authenticated, ACTIVE cleaner (the mobile app
 * sends its Supabase access token as `Authorization: Bearer …`).
 *
 *   const auth = await requireCleaner();
 *   if (!auth.ok) return auth.response;
 */
export async function requireCleaner(): Promise<
  { ok: true; session: CleanerSession } | { ok: false; response: NextResponse }
> {
  const deny = (status: number, error: string) => ({
    ok: false as const,
    response: NextResponse.json({ success: false, error }, { status }),
  });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return deny(401, "Unauthorized");

  const { data: cleaner } = await createAdminClient()
    .from("cleaners")
    .select("id, full_name, is_active")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!cleaner) return deny(403, "Forbidden");
  if (!cleaner.is_active) return deny(403, "This account has been deactivated.");

  return { ok: true, session: { userId: user.id, cleanerId: cleaner.id as string, fullName: cleaner.full_name as string } };
}

/** UK calendar date (YYYY-MM-DD) for "today" — never the server's UTC date. */
export function todayInLondon(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(now);
}
