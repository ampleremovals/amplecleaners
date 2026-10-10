/* eslint-disable @typescript-eslint/no-explicit-any -- untyped Supabase client */
import { createAdminClient } from "@/lib/supabase/server";

/**
 * Who we must not email. `marketing` = unsubscribed (blocks marketing only: their booking emails still
 * go out). `all` = the address bounced or reported us as spam (blocks everything: sending again hurts
 * our domain's reputation for every customer).
 */
export type Suppression = "none" | "marketing" | "all";

/** Addresses of customers erased under GDPR (`erased+…@invalid.local`) can never receive anything. */
export const isErasedAddress = (email: string) => /@invalid\.local$/i.test(email.trim());

export async function suppressionFor(email: string): Promise<Suppression> {
  if (isErasedAddress(email)) return "all";
  try {
    const { data } = await (createAdminClient() as any).from("email_suppressions").select("scope").eq("email", email.trim().toLowerCase()).maybeSingle();
    return (data?.scope as Suppression | undefined) ?? "none";
  } catch {
    return "none"; // a lookup blip must not stop a customer's booking confirmation
  }
}

export async function suppress(email: string, scope: "marketing" | "all", reason: string): Promise<void> {
  const e = email.trim().toLowerCase();
  const db: any = createAdminClient();
  const { data: existing } = await db.from("email_suppressions").select("scope").eq("email", e).maybeSingle();
  if (existing?.scope === "all") return; // never downgrade
  await db.from("email_suppressions").upsert({ email: e, scope, reason }, { onConflict: "email" });
}

export async function unsuppress(email: string): Promise<void> {
  // Only an unsubscribe can be undone by the customer; a bounce/complaint stays.
  await (createAdminClient() as any).from("email_suppressions").delete().eq("email", email.trim().toLowerCase()).eq("scope", "marketing");
}
