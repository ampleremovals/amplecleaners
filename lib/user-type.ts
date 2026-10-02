/**
 * User Type Detection
 * Determines if an authenticated user is an admin or a cleaner.
 */

import { createAdminClient } from "@/lib/supabase/server";

export type UserType = "admin" | "cleaner" | "unknown";

/**
 * Determines the type of user based on their auth UUID.
 *   - Found in `cleaners` (auth_user_id = userId) → cleaner
 *   - Otherwise → admin (default assumption, same pattern as Ample Removals)
 */
export async function getUserType(userId: string | undefined): Promise<UserType> {
  if (!userId) return "unknown";

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("cleaners")
      .select("id")
      .eq("auth_user_id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return "admin"; // no rows → not a cleaner
      console.error("getUserType error:", error);
      return "unknown";
    }
    if (data) return "cleaner";
    return "admin";
  } catch (error) {
    console.error("getUserType exception:", error);
    return "unknown";
  }
}

export async function isCleaner(userId: string | undefined): Promise<boolean> {
  return (await getUserType(userId)) === "cleaner";
}

/**
 * Checks if a user is an admin AND still active in `admin_users` (deactivating
 * someone there actually revokes access, not just hides a menu item).
 */
export async function isAdmin(userId: string | undefined): Promise<boolean> {
  const userType = await getUserType(userId);
  if (userType !== "admin" || !userId) return false;
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("admin_users")
      .select("is_active")
      .eq("supabase_user_id", userId)
      .maybeSingle();
    if (data && data.is_active === false) return false;
  } catch {
    /* admin_users lookup failing shouldn't lock everyone out */
  }
  return true;
}
