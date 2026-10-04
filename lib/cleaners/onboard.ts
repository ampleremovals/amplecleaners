/* eslint-disable @typescript-eslint/no-explicit-any -- untyped Supabase client */
import { createAdminClient } from "@/lib/supabase/server";
import { sendEmailSafe } from "@/lib/notify";
import { logError } from "@/lib/log-error";
import { emailShell } from "@/lib/email-templates";
import { normaliseUKPhone } from "@/lib/utils";

const RESET_REDIRECT_URL = `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.amplecleaners.com"}/cleaners/reset-password/update`;

export type OnboardResult = { ok: true; cleanerId: string } | { ok: false; error: string; status: number };

/**
 * Adds a cleaner to the roster AND creates their Supabase login, then emails a
 * "set your password" link. Shared by the admin's manual add and by approving
 * an application, so both behave identically. The auth user is created first
 * and removed again if the roster insert fails (no orphaned logins).
 */
export async function onboardCleaner(input: {
  fullName: string;
  email: string;
  phone: string;
  payRatePerHour?: number | null;
  coveragePrefixes?: string[];
}): Promise<OnboardResult> {
  const supabase: any = createAdminClient();
  const email = input.email.trim().toLowerCase();

  const { data: dupe } = await supabase.from("cleaners").select("id").ilike("email", email).maybeSingle();
  if (dupe) return { ok: false, error: "A cleaner with this email already exists.", status: 409 };

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({ email, email_confirm: true });
  if (authError || !authData.user) {
    return { ok: false, error: authError?.message ?? "Failed to create login for this cleaner", status: 500 };
  }

  const { data: cleaner, error } = await supabase
    .from("cleaners")
    .insert({
      auth_user_id: authData.user.id, full_name: input.fullName, email,
      phone: normaliseUKPhone(input.phone), pay_rate_per_hour: input.payRatePerHour ?? null,
    })
    .select("id")
    .single();
  if (error || !cleaner) {
    await supabase.auth.admin.deleteUser(authData.user.id);
    return { ok: false, error: error?.message ?? "Failed to create cleaner", status: 500 };
  }

  const prefixes = [...new Set((input.coveragePrefixes ?? []).map((p) => p.trim().toUpperCase()).filter(Boolean))];
  if (prefixes.length) {
    await supabase.from("cleaner_coverage_areas").insert(prefixes.map((postcode_prefix) => ({ cleaner_id: cleaner.id, postcode_prefix })));
  }

  try {
    const { data: link, error: linkError } = await supabase.auth.admin.generateLink({ type: "recovery", email, options: { redirectTo: RESET_REDIRECT_URL } });
    const actionLink = link?.properties?.action_link;
    if (linkError || !actionLink) {
      await logError({ message: `Cleaner welcome generateLink failed: ${linkError?.message ?? "no link"}`, metadata: { email } });
    } else {
      await sendEmailSafe({
        to: email,
        subject: "Welcome to Ample Cleaners — set your password",
        context: "cleaner welcome",
        html: emailShell({
          heading: "Welcome to the team 💚",
          bodyHtml: `<p>Hi ${input.fullName.split(" ")[0]},</p><p>You're now part of Ample Cleaners. Set your password below, then download the <strong>Ample Cleaner</strong> app and sign in with this email.</p><p style="font-size:13px;color:#64748b;">This link expires in 1 hour — you can always request a new one from the app's "Forgot password?" screen.</p>`,
          cta: { label: "Set my password", href: actionLink },
        }),
      });
    }
  } catch (e) {
    await logError({ message: `Cleaner welcome email failed: ${e instanceof Error ? e.message : String(e)}`, metadata: { email } });
  }
  return { ok: true, cleanerId: cleaner.id };
}
