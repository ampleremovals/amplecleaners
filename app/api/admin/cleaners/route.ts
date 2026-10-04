import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/resend";
import { logError } from "@/lib/log-error";
import { z } from "zod";

const RESET_REDIRECT_URL = `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.amplecleaners.com"}/cleaners/reset-password/update`;

function welcomeEmailHtml(firstName: string, actionLink: string): string {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 8px 24px rgba(15,23,42,0.08);">
        <tr><td style="background:linear-gradient(135deg,#052e16 0%,#15803d 55%,#16a34a 100%);padding:36px 32px;text-align:center;">
          <div style="display:inline-block;background:rgba(255,255,255,0.14);border-radius:14px;padding:10px 18px;">
            <span style="color:#ffffff;font-size:20px;font-weight:800;letter-spacing:0.3px;">Ample Cleaners</span>
          </div>
          <h1 style="color:#ffffff;margin:20px 0 0;font-size:24px;font-weight:800;">Welcome to the team</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 16px;color:#0f172a;font-size:16px;">Hi ${firstName},</p>
          <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.65;">
            You've been added as a cleaner. Set your password below, then download the Ample Cleaner app and sign in with this email. This link expires in <strong>1 hour</strong>.
          </p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 28px;"><tr><td align="center">
            <a href="${actionLink}" style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;padding:15px 36px;border-radius:12px;">
              Set my password
            </a>
          </td></tr></table>
        </td></tr>
        <tr><td style="background:#0f172a;padding:20px 32px;text-align:center;">
          <p style="margin:0;color:#94a3b8;font-size:12px;">© Ample Cleaners · Account security</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("cleaners")
    .select("id, full_name, email, phone, is_active, dbs_verified, rating_avg, pay_rate_per_hour, created_at")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, cleaners: data ?? [] });
}

const createSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(8),
  payRatePerHour: z.number().positive().optional(),
});

/**
 * POST /api/admin/cleaners — add a cleaner to the roster AND create their
 * Supabase Auth login (so the cleaner mobile app actually works). Creates
 * the auth user first (no password set), links `auth_user_id`, then emails
 * a "set your password" link via the same recovery-link + Resend split
 * used for the forgot-password flow. If the roster insert fails after the
 * auth user was created, the auth user is cleaned up so we don't leak
 * orphaned logins.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }
  const { fullName, email, phone, payRatePerHour } = parsed.data;

  const supabase = createAdminClient();

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({ email, email_confirm: true });
  if (authError || !authData.user) {
    return NextResponse.json({ success: false, error: authError?.message ?? "Failed to create login for this cleaner" }, { status: 500 });
  }

  const { data: cleaner, error } = await supabase
    .from("cleaners")
    .insert({ auth_user_id: authData.user.id, full_name: fullName, email, phone, pay_rate_per_hour: payRatePerHour ?? null })
    .select("id")
    .single();
  if (error || !cleaner) {
    await supabase.auth.admin.deleteUser(authData.user.id); // don't leak an orphaned login
    return NextResponse.json({ success: false, error: error?.message ?? "Failed to create cleaner" }, { status: 500 });
  }

  try {
    const { data: link, error: linkError } = await supabase.auth.admin.generateLink({ type: "recovery", email, options: { redirectTo: RESET_REDIRECT_URL } });
    const actionLink = link?.properties?.action_link;
    if (linkError || !actionLink) {
      await logError({ message: `Cleaner welcome generateLink failed: ${linkError?.message ?? "no link"}`, metadata: { email } });
    } else {
      await sendEmail({ to: email, subject: "Welcome to Ample Cleaners — set your password", html: welcomeEmailHtml(fullName.split(" ")[0], actionLink) });
    }
  } catch (e) {
    await logError({ message: `Cleaner welcome email failed: ${e instanceof Error ? e.message : String(e)}`, metadata: { email } });
  }

  return NextResponse.json({ success: true, id: cleaner.id });
}
