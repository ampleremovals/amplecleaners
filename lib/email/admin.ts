import { z } from "zod";
import { COMMON_VARIABLES } from "@/lib/email/defaults";
import { findVariables } from "@/lib/email/markup";
import { SITE_URL } from "@/lib/email/config";

/** What the preview and test sends fill the variables with. */
export const SAMPLE_VARS: Record<string, string | number> = {
  firstName: "Sam", reference: "REG-2026-ABCDE", serviceLabel: "Deep Cleaning", serviceLower: "deep cleaning", cleanDate: "Tuesday 14 October 2026",
  quoteTotal: "£85.00", quoteLink: `${SITE_URL}/quote/example`, manageLink: `${SITE_URL}/manage/example`, rateLink: `${SITE_URL}/rate/example`,
  bookingLink: `${SITE_URL}/booking/deep_cleaning`, regularLink: `${SITE_URL}/booking/regular_cleaning`, rating: 5,
  prepTips: "- Make sure we can get in\n- Tidy away personal items so every surface can be cleaned\n- Tell us about pets, and anything you'd like us to focus on",
};

const urlField = z.string().trim().max(500).refine((v) => v === "" || /^\{\{\s*[A-Za-z]+\s*\}\}$/.test(v) || /^https:\/\//i.test(v), "The button link must be a {{variable}} or an https:// address");

export const templateEditSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  subject: z.string().trim().min(2).max(200),
  heading: z.string().trim().min(2).max(150),
  body: z.string().trim().min(10).max(8000),
  cta_label: z.string().trim().max(60).nullable().optional(),
  cta_url: urlField.nullable().optional(),
  enabled: z.boolean().optional(),
});

/** Variables used in the text that we don't provide: they would silently render as empty. */
export function unknownVariables(...texts: (string | null | undefined)[]): string[] {
  const known = new Set(Object.keys(COMMON_VARIABLES));
  return [...new Set(texts.flatMap((t) => findVariables(t ?? "")))].filter((v) => !known.has(v));
}

export const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 50);
