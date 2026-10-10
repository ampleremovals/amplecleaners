import { escapeHtml } from "@/lib/email/markup";
import type { Company } from "@/lib/email/config";

const GREEN = "#15803d";
const FONT = "Arial,Helvetica,sans-serif";

/**
 * The branded shell for every engine email. Built from tables with inline styles and bgcolor attributes,
 * because Outlook (Word's renderer) ignores most modern CSS; the button is the "bulletproof" table-cell
 * kind, and the colour-scheme hint asks clients not to re-colour it in dark mode. Single 600px column.
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
    ? `<table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" style="margin:26px auto 8px;"><tr><td align="center" bgcolor="${GREEN}" style="background:${GREEN};border-radius:10px;"><a href="${escapeHtml(cta.href)}" target="_blank" style="display:inline-block;padding:14px 30px;font-family:${FONT};font-size:16px;font-weight:bold;line-height:20px;color:#ffffff;text-decoration:none;border-radius:10px;">${escapeHtml(cta.label)}</a></td></tr></table>`
    : "";
  const why = unsubscribeHref
    ? `You are receiving this because you have enquired or booked with ${escapeHtml(company.name)}. <a href="${escapeHtml(unsubscribeHref)}" style="color:#64748b;text-decoration:underline;">Unsubscribe</a> from these emails at any time.`
    : `You are receiving this about your enquiry or booking with ${escapeHtml(company.name)}.`;
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>${escapeHtml(heading)}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;">
${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:#f1f5f9;">${escapeHtml(preheader)}</div>` : ""}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f1f5f9" style="background:#f1f5f9;"><tr><td align="center" style="padding:16px;">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">
    <tr><td bgcolor="${GREEN}" style="background:${GREEN};padding:22px 28px;border-radius:12px 12px 0 0;font-family:${FONT};">
      <h1 style="margin:0;font-family:${FONT};font-size:21px;line-height:1.3;color:#ffffff;">${escapeHtml(heading)}</h1>
    </td></tr>
    <tr><td bgcolor="#ffffff" style="background:#ffffff;padding:28px;border:1px solid #e2e8f0;border-top:0;border-radius:0 0 12px 12px;font-family:${FONT};color:#1e293b;">
      ${bodyHtml}
      ${button}
      <p style="font-family:${FONT};font-size:15px;line-height:1.6;margin:22px 0 0;color:#334155;">Any questions? Just reply to this email or call ${escapeHtml(company.phone)}.<br><br>${escapeHtml(company.name)}</p>
    </td></tr>
    <tr><td align="center" style="padding:16px 8px 0;font-family:${FONT};font-size:12px;line-height:1.6;color:#94a3b8;">${escapeHtml(company.name)} · ${escapeHtml(company.address)}<br>${why}</td></tr>
  </table>
</td></tr></table>
</body></html>`;
}

/** A person-to-person email (Inbox replies): just their words and a signature. No banner, no button. */
export function renderPlainEmailHtml(bodyHtml: string, company: Company): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="color-scheme" content="light"></head><body style="margin:0;padding:16px;background:#ffffff;">
  <div style="font-family:${FONT};color:#1e293b;max-width:600px;">
    ${bodyHtml}
    <p style="font-size:14px;margin:20px 0 0;color:#334155;">${escapeHtml(company.name)}<br>${escapeHtml(company.phone)}</p>
    <p style="font-size:12px;color:#94a3b8;margin:14px 0 0;">${escapeHtml(company.name)} · ${escapeHtml(company.address)}</p>
  </div>
</body></html>`;
}
