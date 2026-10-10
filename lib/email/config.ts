import { COMPANY_ADDRESS, COMPANY_NAME, COMPANY_PHONE } from "@/lib/constants";
import { createAdminClient } from "@/lib/supabase/server";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.amplecleaners.com").replace(/\/$/, "");

export interface Company { name: string; address: string; phone: string; replyTo: string | null; googleReviewLink: string | null }

/** Company details for footers and reply-to, from Settings (falls back to the constants). */
export async function loadCompany(): Promise<Company> {
  try {
    const { data } = await createAdminClient().from("settings").select("company_name, company_address, company_phone, company_email, google_review_link").eq("id", 1).maybeSingle();
    return {
      name: data?.company_name || COMPANY_NAME,
      address: data?.company_address || COMPANY_ADDRESS,
      phone: data?.company_phone || COMPANY_PHONE,
      replyTo: data?.company_email || process.env.RESEND_ADMIN_EMAIL || null,
      googleReviewLink: data?.google_review_link || null,
    };
  } catch {
    return { name: COMPANY_NAME, address: COMPANY_ADDRESS, phone: COMPANY_PHONE, replyTo: process.env.RESEND_ADMIN_EMAIL || null, googleReviewLink: null };
  }
}
