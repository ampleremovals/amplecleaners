import { supabase } from "./supabase";
import { ENV } from "./env";
import { unregisterForPush } from "./push";

export interface SignInResult {
  ok: boolean;
  error?: string;
  cleanerId?: string;
}

/** The cleaner row (by auth_user_id) for the signed-in user, or null. */
export async function getCleanerRecord(userId: string): Promise<{ id: string } | null> {
  const { data } = await supabase
    .from("cleaners")
    .select("id")
    .eq("auth_user_id", userId)
    .maybeSingle();
  return data ?? null;
}

/**
 * Sign in a cleaner. After authenticating we verify the user IS a cleaner —
 * this app is cleaner-only; non-cleaners are signed straight back out.
 */
export async function signInCleaner(email: string, password: string): Promise<SignInResult> {
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error || !data.user) return { ok: false, error: "Invalid email or password." };

  const cleaner = await getCleanerRecord(data.user.id);
  if (!cleaner) {
    await supabase.auth.signOut();
    return { ok: false, error: "This app is for Ample Cleaners staff only." };
  }
  return { ok: true, cleanerId: cleaner.id };
}

export async function signOut(): Promise<void> {
  await unregisterForPush(); // needs the live session, so before signOut
  await supabase.auth.signOut();
}

/**
 * Trigger a cleaner password reset via our own API route (mints the link
 * through the admin API, sends a branded email through Resend). Always
 * resolves ok on a 2xx — the route never reveals whether an account exists.
 */
export async function sendPasswordReset(email: string): Promise<SignInResult> {
  try {
    const res = await fetch(`${ENV.SITE_URL}/api/cleaners/reset-password/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim() }),
    });
    if (!res.ok) return { ok: false, error: "Could not send the reset email. Please try again." };
    return { ok: true };
  } catch {
    return { ok: false, error: "Network error. Please check your connection and try again." };
  }
}
