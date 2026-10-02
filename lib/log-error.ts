import { createAdminClient } from "@/lib/supabase/server";

interface LogErrorParams {
  message: string;
  metadata?: Record<string, unknown>;
  level?: "error" | "warn" | "info";
}

/**
 * Writes a structured log entry to the server_logs table.
 * Never throws — if the insert fails, falls back to console.error.
 */
export async function logError({ message, metadata = {}, level = "error" }: LogErrorParams): Promise<void> {
  try {
    const supabase = createAdminClient();
    await supabase.from("server_logs").insert({ level, message, metadata });
  } catch (err) {
    console.error("[logError] failed to write to server_logs:", err);
    console.error(`[${level.toUpperCase()}] ${message}`, metadata);
  }
}
