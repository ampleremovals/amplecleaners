import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { AppState } from "react-native";
import { ENV } from "./env";

/**
 * Supabase client — same project, users and sessions as the Ample Cleaners
 * web platform. Session persistence uses AsyncStorage (SecureStore's ~2KB
 * per-value limit can silently break Supabase sessions — same lesson learned
 * on the driver app).
 */
export const supabase = createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/** Drive token auto-refresh off app foreground/background. Call once from root. */
export function registerSupabaseAppStateRefresh(): () => void {
  const sub = AppState.addEventListener("change", (state) => {
    if (state === "active") supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
  supabase.auth.startAutoRefresh();
  return () => sub.remove();
}
