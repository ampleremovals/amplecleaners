/** One-off: copies the default SMS/WhatsApp texts onto already-seeded templates that don't have any yet. Safe to re-run. */
import { createClient } from "@supabase/supabase-js";
import { TEMPLATES } from "../lib/email/defaults";

async function main() {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  for (const t of TEMPLATES.filter((x) => x.sms || x.whatsapp)) {
    const { data } = await db.from("email_templates").update({ sms_body: t.sms ?? null, whatsapp_body: t.whatsapp ?? null }).eq("key", t.key).is("sms_body", null).is("whatsapp_body", null).select("key");
    console.log(t.key, data?.length ? "backfilled" : "already set");
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
