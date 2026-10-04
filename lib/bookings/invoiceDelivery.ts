/**
 * Invoice / receipt / chase messaging — email + SMS + WhatsApp, always all
 * three ("send a message" means all three). Tone: warm, never pushy.
 */
import { notifyCustomer } from "@/lib/notify";
import { emailShell, BRAND } from "@/lib/email-templates";
import { generateInvoiceToken } from "@/lib/tokens";
import { formatCurrency, formatDate } from "@/lib/utils";

const site = () => process.env.NEXT_PUBLIC_SITE_URL ?? "";

export function invoiceLinks(invoiceId: string): { pay: string; pdf: string } {
  const token = generateInvoiceToken(invoiceId) ?? "";
  return {
    pay: `${site()}/pay/${invoiceId}/${token}`,
    pdf: `${site()}/api/invoices/${invoiceId}/pdf?token=${token}`,
  };
}

export interface InvoiceMessageParams {
  invoiceId: string;
  invoiceNumber: string;
  reference: string;
  firstName: string;
  email: string;
  phone: string;
  total: number;
  dueDate: string | null;
  kind: "full_balance" | "recurring";
}

/** Sent the moment a job is completed: thanks + what's due + one-tap pay. */
export async function sendBalanceInvoiceMessages(p: InvoiceMessageParams): Promise<void> {
  const { pay, pdf } = invoiceLinks(p.invoiceId);
  const amount = formatCurrency(p.total);
  const due = p.dueDate ? formatDate(p.dueDate) : "within 7 days";
  const lead = p.kind === "recurring" ? "Thanks for having us today — your clean is done ✨" : "Your clean is done ✨ — we hope you love the result.";

  await notifyCustomer({
    context: `invoice ${p.invoiceNumber}`,
    email: p.email,
    phone: p.phone,
    subject: `Your Ample Cleaners invoice — ${amount} (${p.invoiceNumber})`,
    html: emailShell({
      heading: "Your clean is complete ✨",
      reference: p.reference,
      bodyHtml: `<p>Hi ${p.firstName},</p><p>${lead}</p>
        <div style="border:2px solid ${BRAND.green};border-radius:12px;padding:18px;margin:20px 0;">
          <table style="width:100%;"><tr>
            <td style="color:${BRAND.muted};">Invoice ${p.invoiceNumber}<br><span style="font-size:13px;">Due ${due}</span></td>
            <td style="text-align:right;font-size:24px;font-weight:bold;color:${BRAND.green};">${amount}</td>
          </tr></table>
        </div>
        <p style="font-size:14px;color:${BRAND.muted};">Pay by card or bank transfer from the secure page below. <a href="${pdf}" style="color:${BRAND.green};">Download PDF invoice</a></p>`,
      cta: { label: `Pay ${amount} now`, href: pay },
    }),
    sms: `Ample Cleaners: thanks! Your invoice (${amount}) is ready — pay securely here: ${pay} (Ref ${p.reference})`,
    whatsapp: `Hi ${p.firstName}, your clean is done ✨\n\nInvoice ${p.invoiceNumber}: *${amount}* (due ${due})\n\nPay securely by card or bank transfer:\n${pay}\n\nRef: ${p.reference}`,
  });
}

/** Gentle chase for an unpaid invoice. `n` = which reminder this is (1..3). */
export async function sendInvoiceReminderMessages(p: InvoiceMessageParams & { n: number }): Promise<void> {
  const { pay } = invoiceLinks(p.invoiceId);
  const amount = formatCurrency(p.total);
  const opener =
    p.n <= 1 ? "Just a quick nudge — your invoice is still open."
    : p.n === 2 ? "A friendly reminder that your invoice is still outstanding."
    : "Your invoice is now overdue — could you settle it today, please?";

  await notifyCustomer({
    context: `invoice reminder ${p.n} ${p.invoiceNumber}`,
    email: p.email,
    phone: p.phone,
    subject: `Reminder: invoice ${p.invoiceNumber} — ${amount}`,
    html: emailShell({
      heading: "A quick reminder",
      reference: p.reference,
      bodyHtml: `<p>Hi ${p.firstName},</p><p>${opener}</p><p><strong>${amount}</strong> · Invoice ${p.invoiceNumber}</p><p style="font-size:14px;color:${BRAND.muted};">Already paid by bank transfer? Thank you — it can take us a day to match it, so please ignore this.</p>`,
      cta: { label: `Pay ${amount}`, href: pay },
    }),
    sms: `Ample Cleaners: ${opener} Pay ${amount} here: ${pay} (Ref ${p.reference})`,
    whatsapp: `Hi ${p.firstName}, ${opener}\n\n*${amount}* — pay here:\n${pay}\n\nAlready paid? Thank you, please ignore this.\nRef: ${p.reference}`,
  });
}

/** Receipt + (optional) review ask, sent when a balance invoice is paid. */
export async function sendPaymentReceiptMessages(p: {
  reference: string; firstName: string; email: string; phone: string; amount: number; invoiceNumber: string;
  rateLink: string; googleReviewLink?: string | null;
}): Promise<void> {
  const amount = formatCurrency(p.amount);
  const review = p.googleReviewLink
    ? `<p style="font-size:14px;">Loved it? A quick Google review means the world to a small team: <a href="${p.googleReviewLink}" style="color:${BRAND.green};">leave a review</a></p>`
    : "";
  await notifyCustomer({
    context: `receipt ${p.invoiceNumber}`,
    email: p.email,
    phone: p.phone,
    subject: `Payment received — thank you (${p.reference})`,
    html: emailShell({
      heading: "Payment received — thank you 💚",
      reference: p.reference,
      bodyHtml: `<p>Hi ${p.firstName},</p><p>We've received your payment of <strong>${amount}</strong> for invoice ${p.invoiceNumber}. You're all settled.</p><p>How did we do? It takes five seconds and helps us look after you (and everyone else) better.</p>${review}`,
      cta: { label: "Rate your clean", href: p.rateLink },
    }),
    sms: `Ample Cleaners: payment of ${amount} received — thank you! Rate your clean (5 sec): ${p.rateLink}`,
    whatsapp: `Hi ${p.firstName}, payment of *${amount}* received — thank you 💚\n\nHow did we do? Rate your clean in 5 seconds:\n${p.rateLink}`,
  });
}
