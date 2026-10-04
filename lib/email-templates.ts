/** Shared branded email shell — green brand, one CTA, mobile-safe single column. */

export const BRAND = { green: "#15803d", greenDark: "#14532d", greenSoft: "#f0fdf4", ink: "#1e293b", muted: "#64748b" } as const;
export const COMPANY_PHONE = "0333 000 0000";

export function emailShell(opts: {
  heading: string;
  bodyHtml: string;
  cta?: { label: string; href: string };
  reference?: string;
  headerColor?: string;
}): string {
  const cta = opts.cta
    ? `<p style="text-align:center;margin:28px 0 8px;">
         <a href="${opts.cta.href}" style="background:${BRAND.green};color:#fff;text-decoration:none;padding:14px 30px;border-radius:10px;font-weight:bold;font-size:16px;display:inline-block;">${opts.cta.label}</a>
       </p>`
    : "";
  const ref = opts.reference ? `<p style="font-size:13px;color:#94a3b8;margin:20px 0 0;">Ref: ${opts.reference}</p>` : "";
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;color:${BRAND.ink};max-width:600px;margin:0 auto;">
    <div style="background:${opts.headerColor ?? BRAND.green};padding:24px;border-radius:12px 12px 0 0;">
      <h1 style="color:#fff;margin:0;font-size:22px;">${opts.heading}</h1>
    </div>
    <div style="background:#fff;padding:32px;border:1px solid #e2e8f0;border-top:0;border-radius:0 0 12px 12px;font-size:16px;line-height:1.55;">
      ${opts.bodyHtml}
      ${cta}
      <p style="font-size:15px;margin:24px 0 0;">Any questions? Call us on ${COMPANY_PHONE}.<br><br>Ample Cleaners</p>
      ${ref}
    </div>
  </div>`;
}
