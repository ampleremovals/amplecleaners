/**
 * POST /api/cleaners/reset-password/request   { email }
 *
 * Cleaner "forgot password" (and the "set your password" welcome link,
 * reused for both). Mints the recovery link via the Supabase admin API but
 * sends OUR OWN branded email through Resend instead of Supabase's default
 * mailer — same split Ample Removals uses for drivers.
 *
 * Public + service-role, deliberately careful:
 *  - always returns { success: true } (never reveals whether an account exists)
 *  - only emails addresses that belong to a CLEANER
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/resend";
import { logError } from "@/lib/log-error";

const RESET_REDIRECT_URL = `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.amplecleaners.com"}/cleaners/reset-password/update`;

const schema = z.object({ email: z.string().email() });

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: true });

  const email = parsed.data.email.trim().toLowerCase();
  const supabase = createAdminClient();

  try {
    const { data: cleaner } = await supabase.from("cleaners").select("id, full_name, email").ilike("email", email).maybeSingle();

    if (cleaner) {
      const { data, error } = await supabase.auth.admin.generateLink({
        type: "recovery",
        email: cleaner.email,
        options: { redirectTo: RESET_REDIRECT_URL },
      });

      const actionLink = data?.properties?.action_link;
      if (error || !actionLink) {
        await logError({ message: `Cleaner reset generateLink failed: ${error?.message ?? "no link"}`, metadata: { email } });
      } else {
        try {
          await sendEmail({ to: cleaner.email, subject: "Set your Ample Cleaners password", html: resetEmailHtml(cleaner.full_name ?? "there", actionLink) });
        } catch (mailErr) {
          await logError({ message: `Cleaner reset email send failed: ${mailErr instanceof Error ? mailErr.message : String(mailErr)}`, metadata: { email } });
        }
      }
    }
  } catch (err) {
    await logError({ message: `Cleaner reset request error: ${err instanceof Error ? err.message : String(err)}`, metadata: { email } });
  }

  return NextResponse.json({ success: true });
}

function resetEmailHtml(name: string, actionLink: string): string {
  const firstName = name.split(" ")[0];
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 8px 24px rgba(15,23,42,0.08);">
        <tr><td style="background:linear-gradient(135deg,#134e4a 0%,#0f766e 55%,#0d9488 100%);padding:36px 32px;text-align:center;">
          <div style="display:inline-block;background:rgba(255,255,255,0.14);border-radius:14px;padding:10px 18px;">
            <span style="color:#ffffff;font-size:20px;font-weight:800;letter-spacing:0.3px;">Ample Cleaners</span>
          </div>
          <h1 style="color:#ffffff;margin:20px 0 0;font-size:24px;font-weight:800;">Set your password</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 16px;color:#0f172a;font-size:16px;">Hi ${firstName},</p>
          <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.65;">
            Tap the button below to set your password for the Ample Cleaner app. This link expires in <strong>1 hour</strong>.
          </p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 28px;"><tr><td align="center">
            <a href="${actionLink}" style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;padding:15px 36px;border-radius:12px;box-shadow:0 6px 16px rgba(22,163,74,0.32);">
              Set my password
            </a>
          </td></tr></table>
          <p style="margin:0 0 8px;color:#64748b;font-size:13px;">If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="margin:0 0 28px;word-break:break-all;"><a href="${actionLink}" style="color:#0f766e;font-size:12px;text-decoration:underline;">${actionLink}</a></p>
          <div style="border-top:1px solid #e2e8f0;padding-top:20px;">
            <p style="margin:0;color:#94a3b8;font-size:13px;line-height:1.6;">Didn't ask for this? You can safely ignore this email.</p>
          </div>
        </td></tr>
        <tr><td style="background:#0f172a;padding:20px 32px;text-align:center;">
          <p style="margin:0;color:#94a3b8;font-size:12px;">© Ample Cleaners · Account security</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
