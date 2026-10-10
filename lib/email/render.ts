import { interpolate, markupToHtml, markupToText } from "@/lib/email/markup";
import { renderEmailHtml } from "@/lib/email/layout";
import { oneClickUnsubscribeUrl, unsubscribeUrl } from "@/lib/email/unsubscribe";
import { SITE_URL, type Company } from "@/lib/email/config";
import type { TemplateRow } from "@/lib/email/store";

export type Vars = Record<string, string | number | null | undefined>;

export interface Rendered { sms: string | null; whatsapp: string | null; subject: string; html: string; text: string; unsubscribeHref: string | null; oneClickHref: string | null; ctaHref: string | null }

/** Turns a template + variables into the final subject/HTML/text for one recipient. */
export function renderTemplate(
  tpl: Pick<TemplateRow, "category" | "subject" | "heading" | "body" | "cta_label" | "cta_url"> & Partial<Pick<TemplateRow, "sms_body" | "whatsapp_body" | "subject_b">>,
  vars: Vars,
  company: Company,
  toEmail: string,
  /** A/B test arm: "B" uses the template's alternative subject line when it has one. */
  variant: "A" | "B" = "A",
): Rendered {
  const all: Vars = { phone: company.phone, siteUrl: SITE_URL, googleReviewLink: company.googleReviewLink, ...vars };
  const subject = interpolate(variant === "B" && tpl.subject_b ? tpl.subject_b : tpl.subject, all).replace(/\s+/g, " ").trim();
  const heading = interpolate(tpl.heading, all).trim();
  const body = interpolate(tpl.body, all);
  const rawCta = tpl.cta_url ? interpolate(tpl.cta_url, all).trim() : "";
  const ctaHref = /^https?:\/\//i.test(rawCta) ? rawCta : null;
  const unsubscribeHref = tpl.category === "marketing" ? unsubscribeUrl(toEmail) : null;
  const html = renderEmailHtml({
    heading,
    bodyHtml: markupToHtml(body),
    cta: ctaHref && tpl.cta_label ? { label: interpolate(tpl.cta_label, all), href: ctaHref } : null,
    company,
    unsubscribeHref,
    preheader: markupToText(body).replace(/\s+/g, " ").slice(0, 110),
  });
  const text = [markupToText(body), ctaHref && tpl.cta_label ? `${tpl.cta_label}: ${ctaHref}` : "", `${company.name}, ${company.address}`, unsubscribeHref ? `Unsubscribe: ${unsubscribeHref}` : ""].filter(Boolean).join("\n\n");
  return { sms: tpl.sms_body ? interpolate(tpl.sms_body, all).trim() : null, whatsapp: tpl.whatsapp_body ? interpolate(tpl.whatsapp_body, all).trim() : null, subject, html, text, unsubscribeHref, oneClickHref: tpl.category === "marketing" ? oneClickUnsubscribeUrl(toEmail) : null, ctaHref };
}
