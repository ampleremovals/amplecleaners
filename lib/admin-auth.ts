import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/user-type";

/**
 * Verifies the caller is an authenticated admin (not anonymous, not a cleaner).
 *
 * Usage at the top of an admin API handler:
 *   const auth = await requireAdmin();
 *   if (!auth.ok) return auth.response;
 *   // ...proceed; auth.userId is the admin's id
 */
export async function requireAdmin(): Promise<
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse }
> {
  const supabase = await createClient();

  // Web uses cookie sessions; a future mobile admin app would send a Bearer
  // token — support both the same way Ample Removals does.
  const authHeader = (await headers()).get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  const {
    data: { user },
  } = bearer ? await supabase.auth.getUser(bearer) : await supabase.auth.getUser();

  if (!user) {
    return { ok: false, response: NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }) };
  }
  if (!(await isAdmin(user.id))) {
    return { ok: false, response: NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 }) };
  }
  return { ok: true, userId: user.id };
}
