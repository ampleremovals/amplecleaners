import { escapeHtml } from "@/lib/email/markup";
import type { Company } from "@/lib/email/config";

const GREEN = "#15803d";

/**
 * The branded shell for every engine email: green header, one call-to-action, footer with the company's
 * postal address and (for marketing) an unsubscribe link. Single column, 600px, inline styles only.
 */
export function renderEmailHtml(opts: {
  heading: string;
  bodyHtml: string;
  cta?: { label: string; href: string } | null;
  company: Company;
  /** Present on marketing mail; the footer then carries the unsubscribe link. */
  unsubscribeHref?: string | null;
  preheader?: string;
}): string {
  const { heading, bodyHtml, cta, company, unsubscribeHref, preheader } = opts;
  const button = cta
    ? `<p style="text-align:center;margin:26px 0 8px;"><a href="${escapeHtml(cta.href)}" style="background:${GREEN};color:#ffffff;text-decoration:none;padding:14px 30px;border-radius:10px;font-weight:bold;font-size:16px;display:inline-block;">${escapeHtml(cta.label)}</a></p>`
    : "";
  const why = unsubscribeHref
    ? `You are receiving this because you have enquired or booked with ${escapeHtml(company.name)}. <a href="${escapeHtml(unsubscribeHref)}" style="color:#64748b;text-decoration:underline;">Unsubscribe</a> from these emails at any time.`
    : `You are receiving this about your enquiry or booking with ${escapeHtml(company.name)}.`;
  return `<!DOCTYPE html><html><body style="margin:0;padding:16px;background:#f1f5f9;">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>` : ""}
  <div style="font-family:Arial,Helvetica,sans-serif;color:#1e293b;max-width:600px;margin:0 auto;">
    <div style="background:${GREEN};padding:22px 28px;border-radius:12px 12px 0 0;">
      <h1 style="color:#ffffff;margin:0;font-size:21px;line-height:1.3;">${escapeHtml(heading)}</h1>
    </div>
    <div style="background:#ffffff;padding:28px;border:1px solid #e2e8f0;border-top:0;border-radius:0 0 12px 12px;">
      ${bodyHtml}
      ${button}
      <p style="font-size:15px;margin:22px 0 0;color:#334155;">Any questions? Just reply to this email or call ${escapeHtml(company.phone)}.<br><br>${escapeHtml(company.name)}</p>
    </div>
    <p style="font-size:12px;line-height:1.6;color:#94a3b8;text-align:center;margin:16px 8px 0;">${escapeHtml(company.name)} · ${escapeHtml(company.address)}<br>${why}</p>
  </div>
</body></html>`;
}

/** A person-to-person email (Inbox replies): just their words and a signature. No banner, no button. */
export function renderPlainEmailHtml(bodyHtml: string, company: Company): string {
  return `<!DOCTYPE html><html><body style="margin:0;padding:16px;background:#ffffff;">
  <div style="font-family:Arial,Helvetica,sans-serif;color:#1e293b;max-width:600px;">
    ${bodyHtml}
    <p style="font-size:14px;margin:20px 0 0;color:#334155;">${escapeHtml(company.name)}<br>${escapeHtml(company.phone)}</p>
    <p style="font-size:12px;color:#94a3b8;margin:14px 0 0;">${escapeHtml(company.name)} · ${escapeHtml(company.address)}</p>
  </div>
</body></html>`;
}
