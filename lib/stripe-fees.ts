/**
 * Card-fee pass-through. When a customer pays by card, we add Stripe's fee on top
 * so YOU receive the full invoice amount. The fee is grossed up correctly: since
 * Stripe charges its % on the whole amount (fee included), we solve for the total
 * that leaves exactly the net after their cut.
 *
 * UK Stripe standard pricing: 1.5% + 20p per successful card charge. Edit here if
 * your rate differs.
 */
export const STRIPE_RATE = 0.015;      // 1.5%
export const STRIPE_FIXED_PENCE = 20;  // 20p

/**
 * Given the amount you must NET (in £), returns the total the customer pays by
 * card and the fee, so that after Stripe's cut you receive `net`.
 */
export function cardTotalForNet(netGbp: number): { net: number; fee: number; total: number } {
  const net = Math.max(0, Number(netGbp) || 0);
  const netPence = Math.round(net * 100);
  if (netPence <= 0) return { net: 0, fee: 0, total: 0 };
  const totalPence = Math.ceil((netPence + STRIPE_FIXED_PENCE) / (1 - STRIPE_RATE));
  const feePence = totalPence - netPence;
  return { net: netPence / 100, fee: feePence / 100, total: totalPence / 100 };
}
