/**
 * Registers the delivery-tracking webhook in Resend and prints its signing secret.
 *
 *   RESEND_FULL_ACCESS_KEY=re_... npx tsx scripts/register-resend-webhook.ts
 *
 * The normal RESEND_API_KEY is "send only" and cannot manage webhooks, so this needs a one-off
 * full-access key (Resend dashboard → API Keys → permission "Full access"; delete it afterwards).
 * Put the printed secret in Vercel as RESEND_WEBHOOK_SECRET.
 */
const key = process.env.RESEND_FULL_ACCESS_KEY;
const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.amplecleaners.com").replace(/\/$/, "");

async function main() {
  if (!key) throw new Error("Set RESEND_FULL_ACCESS_KEY");
  const res = await fetch("https://api.resend.com/webhooks", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: `${site}/api/webhooks/resend`, events: ["email.delivered", "email.opened", "email.clicked", "email.bounced", "email.complained"] }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Resend answered ${res.status}: ${JSON.stringify(json)}`);
  console.log("Webhook created:", json.id);
  console.log("Signing secret (set as RESEND_WEBHOOK_SECRET on Vercel):", json.signing_secret ?? "(see the Resend dashboard)");
}

main().catch((e) => { console.error("FAILED:", e instanceof Error ? e.message : e); process.exit(1); });
