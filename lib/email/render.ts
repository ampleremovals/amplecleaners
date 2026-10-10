import { interpolate, markupToHtml, markupToText } from "@/lib/email/markup";
import { renderEmailHtml } from "@/lib/email/layout";
import { oneClickUnsubscribeUrl, unsubscribeUrl } from "@/lib/email/unsubscribe";
import { SITE_URL, type Company } from "@/lib/email/config";
import type { TemplateRow } from "@/lib/email/store";

export type Vars = Record<string, string | number | null | undefined>;

export interface Rendered { subject: string; html: string; text: string; unsubscribeHref: string | null; oneClickHref: string | null; ctaHref: string | null }

/** Turns a template + variables into the final subject/HTML/text for one recipient. */
export function renderTemplate(
  tpl: Pick<TemplateRow, "category" | "subject" | "heading" | "body" | "cta_label" | "cta_url">,
  vars: Vars,
  company: Company,
  toEmail: string,
): Rendered {
  const all: Vars = { phone: company.phone, siteUrl: SITE_URL, googleReviewLink: company.googleReviewLink, ...vars };
  const subject = interpolate(tpl.subject, all).replace(/\s+/g, " ").trim();
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
  return { subject, html, text, unsubscribeHref, oneClickHref: tpl.category === "marketing" ? oneClickUnsubscribeUrl(toEmail) : null, ctaHref };
}
