import Stripe from "stripe";

/**
 * Stripe server client. The API version is pinned; it is cast because the
 * installed SDK's type only allows its own default literal.
 */
type StripeConfig = NonNullable<ConstructorParameters<typeof Stripe>[1]>;

const apiVersion = "2024-04-10" as StripeConfig["apiVersion"];

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion,
  typescript: true,
  appInfo: { name: "Ample Cleaners" },
});

/** Test-mode client (sk_test_…). Present only when the test key is set — lets
 *  the full card flow run with test cards without touching live money. */
export const stripeTest = process.env.STRIPE_SECRET_KEY_TEST
  ? new Stripe(process.env.STRIPE_SECRET_KEY_TEST, { apiVersion, typescript: true, appInfo: { name: "Ample Cleaners (test)" } })
  : null;
