/* eslint-disable @typescript-eslint/no-explicit-any -- untyped Supabase client */
import { createAdminClient } from "@/lib/supabase/server";
import { REMINDER_NOTICE } from "@/lib/email/notice";

/**
 * Keeps proof of what a person was told, where and when (the ICO expects you to be able to show this).
 * One row per source per address per notice wording; never throws.
 */
export async function recordConsent(email: string, source: "booking_form_reminder" | "booking_form_submit", noticeText = REMINDER_NOTICE): Promise<void> {
  try {
    const db: any = createAdminClient();
    const e = email.trim().toLowerCase();
    const { data } = await db.from("email_consents").select("id").eq("email", e).eq("source", source).eq("notice_text", noticeText).limit(1);
    if (!data?.length) await db.from("email_consents").insert({ email: e, source, notice_text: noticeText });
  } catch { /* proof-keeping must never break a booking */ }
}
