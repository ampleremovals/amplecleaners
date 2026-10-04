/**
 * Server-side Expo push notifications to cleaners. Uses Expo's public push
 * endpoint directly (no extra package). Tokens Expo reports as dead
 * (DeviceNotRegistered) are pruned so we don't keep pushing to uninstalled apps.
 */
import { createAdminClient } from "@/lib/supabase/server";
import { logError } from "@/lib/log-error";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export interface PushPayload {
  title: string;
  body: string;
  /** Delivered to the app; `bookingId` makes a tap open that job. */
  data?: Record<string, unknown>;
}

interface ExpoTicket {
  status: "ok" | "error";
  details?: { error?: string };
}

export async function sendPushToCleaner(cleanerId: string, payload: PushPayload): Promise<number> {
  const supabase = createAdminClient();
  const { data: rows } = await supabase.from("cleaner_push_tokens").select("token").eq("cleaner_id", cleanerId);
  const tokens = (rows ?? []).map((r) => r.token as string).filter((t) => t.startsWith("ExponentPushToken") || t.startsWith("ExpoPushToken"));
  if (!tokens.length) return 0;

  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(tokens.map((to) => ({ to, sound: "default", channelId: "default", ...payload }))),
    });
    const json = (await res.json()) as { data?: ExpoTicket[] };
    const tickets = json.data ?? [];
    const dead = tokens.filter((_, i) => tickets[i]?.status === "error" && tickets[i]?.details?.error === "DeviceNotRegistered");
    if (dead.length) await supabase.from("cleaner_push_tokens").delete().in("token", dead);
    return tickets.filter((t) => t.status === "ok").length;
  } catch (e) {
    await logError({ message: "push send failed", metadata: { cleanerId, error: String(e) }, level: "warn" });
    return 0;
  }
}
