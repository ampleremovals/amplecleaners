/* eslint-disable @typescript-eslint/no-explicit-any -- untyped Supabase client */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { notifyCustomer, sendEmailSafe } from "@/lib/notify";
import { emailShell } from "@/lib/email-templates";
import { resendAdminEmail } from "@/lib/resend";
import { normaliseUKPhone } from "@/lib/utils";

export const runtime = "nodejs";

const schema = z.object({
  fullName: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().min(8).max(30),
  postcode: z.string().trim().min(3).max(10),
  areas: z.string().trim().max(200).optional(),
  experienceYears: z.number().int().min(0).max(60).optional(),
  hasRightToWork: z.boolean(),
  hasDbs: z.boolean(),
  availabilityNotes: z.string().trim().max(1000).optional(),
  about: z.string().trim().max(2000).optional(),
  /** Honeypot — real people never see or fill this; bots do. */
  website: z.string().optional(),
});

/**
 * POST /api/cleaners/apply — public cleaner application. Stored for admin
 * review (nobody gets a login until an admin approves). Rate-limited, with a
 * honeypot; a duplicate pending application from the same email is
 * acknowledged without creating a second row.
 */
export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, "cleaner-apply", 4, 3600);
  if (limited) return limited;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message ?? "Please check your details." }, { status: 400 });
  }
  const d = parsed.data;
  if (d.website) return NextResponse.json({ success: true }); // bot: pretend it worked

  const supabase: any = createAdminClient();
  const email = d.email.toLowerCase();

  const { data: pending } = await supabase.from("cleaner_applications").select("id").ilike("email", email).eq("status", "new").maybeSingle();
  if (pending) return NextResponse.json({ success: true, duplicate: true });

  const { data: cleaner } = await supabase.from("cleaners").select("id").ilike("email", email).maybeSingle();
  if (cleaner) {
    return NextResponse.json({ success: false, error: "You already have an Ample Cleaners account — sign in to the app instead." }, { status: 409 });
  }

  const phone = normaliseUKPhone(d.phone);
  const { error } = await supabase.from("cleaner_applications").insert({
    full_name: d.fullName, email, phone, postcode: d.postcode.toUpperCase(), areas: d.areas || null,
    experience_years: d.experienceYears ?? null, has_right_to_work: d.hasRightToWork, has_dbs: d.hasDbs,
    availability_notes: d.availabilityNotes || null, about: d.about || null,
  });
  if (error) return NextResponse.json({ success: false, error: "Couldn't submit your application — please try again." }, { status: 500 });

  const first = d.fullName.split(" ")[0];
  await Promise.allSettled([
    notifyCustomer({
      context: "cleaner application received",
      email, phone,
      subject: "We've received your Ample Cleaners application",
      html: emailShell({
        heading: "Thanks for applying 💚",
        bodyHtml: `<p>Hi ${first},</p><p>We've received your application to join Ample Cleaners and will be in touch within a few days. If it's a good fit we'll set you up with your login and the app.</p>`,
      }),
      sms: `Ample Cleaners: thanks ${first}, we've received your application and will be in touch within a few days.`,
      whatsapp: `Hi ${first}, thanks for applying to join Ample Cleaners 💚 We've received your application and will be in touch within a few days.`,
    }),
    sendEmailSafe({
      to: resendAdminEmail,
      subject: `New cleaner application — ${d.fullName}`,
      context: "admin: cleaner application",
      html: emailShell({
        heading: "New cleaner application",
        bodyHtml: `<p><strong>${d.fullName.replace(/</g, "&lt;")}</strong> · ${d.postcode.toUpperCase()}</p><p>Right to work: <strong>${d.hasRightToWork ? "yes" : "no"}</strong> · DBS: <strong>${d.hasDbs ? "yes" : "no"}</strong></p>`,
        cta: { label: "Review application", href: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/admin/applications` },
      }),
    }),
  ]);
  return NextResponse.json({ success: true });
}
