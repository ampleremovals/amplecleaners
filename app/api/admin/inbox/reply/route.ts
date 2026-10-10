/* eslint-disable @typescript-eslint/no-explicit-any -- untyped Supabase client */
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { resend, resendFrom, OUTBOUND_DISABLED } from "@/lib/resend";
import { loadCompany } from "@/lib/email/config";
import { markupToHtml, markupToText } from "@/lib/email/markup";
import { renderPlainEmailHtml } from "@/lib/email/layout";
import { suppressionFor } from "@/lib/email/suppression";
import { recordDirectSend } from "@/lib/email/outbox";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
  subject: z.string().trim().max(200).optional(),
  body: z.string().trim().min(1, "Write a message first").max(5000),
});

/** POST — reply to a customer from the Inbox. Sent as a normal email; their answer lands back in the Inbox. */
export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const limited = await rateLimit(req, "inbox-reply", 60, 3600);
  if (limited) return limited;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  const { email, body } = parsed.data;
  if ((await suppressionFor(email)) === "all") return NextResponse.json({ success: false, error: "This address bounced or reported us as spam, so we can't email it." }, { status: 409 });

  const db: any = createAdminClient();
  const [company, { data: last }, { data: { user } }, { data: cust }] = await Promise.all([
    loadCompany(),
    db.from("inbox_messages").select("subject").ilike("email", email).not("subject", "is", null).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    (await createClient()).auth.getUser(),
    db.from("customers").select("id").ilike("email", email).limit(1).maybeSingle(),
  ]);
  const base = parsed.data.subject || last?.subject || "Your cleaning with Ample Cleaners";
  const subject = /^re:/i.test(base) ? base : `Re: ${base}`;
  const from = resendFrom.includes("<") ? resendFrom : `${company.name} <${resendFrom}>`;

  let resendId: string | null = "disabled";
  if (!OUTBOUND_DISABLED) {
    const { data, error } = await resend.emails.send({
      from, to: email, subject, html: renderPlainEmailHtml(markupToHtml(body), company), text: `${markupToText(body)}\n\n${company.name}\n${company.address}`,
      ...(company.replyTo ? { replyTo: company.replyTo } : {}),
    });
    if (error) return NextResponse.json({ success: false, error: `The email couldn't be sent: ${error.message}` }, { status: 502 });
    resendId = data?.id ?? null;
  }
  const now = new Date().toISOString();
  await Promise.all([
    db.from("inbox_messages").insert({ direction: "out", customer_id: cust?.id ?? null, email, subject, body_text: body, resend_email_id: resendId && resendId !== "disabled" ? resendId : null, sent_by: user?.email ?? auth.userId, read_at: now }),
    db.from("inbox_messages").update({ read_at: now, handled_at: now }).ilike("email", email).eq("direction", "in").is("handled_at", null),
    recordDirectSend({ to: email, subject, context: "inbox reply", resendId: resendId && resendId !== "disabled" ? resendId : null }),
  ]);
  return NextResponse.json({ success: true });
}
