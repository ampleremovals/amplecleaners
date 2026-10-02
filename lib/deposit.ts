/**
 * Deposit config. The deposit is a percentage of the quote total, paid online
 * (Stripe) or by bank transfer. Mirrors Ample Removals' lib/deposit.ts —
 * including Lesson 18: this constant is only ever used for brand-new bookings
 * (stamped onto `bookings.deposit_percentage` at creation). Every computation
 * against an EXISTING booking must pass that row's own stamped rate so a
 * later site-wide change never alters what that booking owes.
 */

export const DEPOSIT_PERCENTAGE = Number(process.env.NEXT_PUBLIC_DEPOSIT_PERCENTAGE ?? 20);

export function depositFor(total: number, percentage: number = DEPOSIT_PERCENTAGE): number {
  const n = Number(total) || 0;
  const pct = Number(percentage) || 0;
  return Math.round(n * (pct / 100) * 100) / 100;
}

export const BANK_DETAILS = {
  accountName: process.env.NEXT_PUBLIC_BANK_ACCOUNT_NAME ?? "",
  sortCode: process.env.NEXT_PUBLIC_BANK_SORT_CODE ?? "",
  accountNumber: process.env.NEXT_PUBLIC_BANK_ACCOUNT_NUMBER ?? "",
};

export const BANK_DETAILS_CONFIGURED = Boolean(
  BANK_DETAILS.accountName && BANK_DETAILS.sortCode && BANK_DETAILS.accountNumber
);
