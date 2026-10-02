import Stripe from "stripe";

/**
 * Stripe server client. The API version is pinned; it is cast because the
 * installed SDK's type only allows its own default literal.
 */
type StripeConfig = NonNullable<ConstructorParameters<typeof Stripe>[1]>;

const apiVersion = "2024-04-10" as StripeConfig["apiVersion"];

// Same build-time gotcha as lib/resend.ts: the Stripe SDK throws immediately
// on construction if the key is empty, which breaks `next build`'s page-data
// collection before real env vars exist for this project. A placeholder
// satisfies the constructor; real API calls still fail gracefully until the
// actual key is set (every call site here is wrapped in try/catch).
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder_not_configured", {
  apiVersion,
  typescript: true,
  appInfo: { name: "Ample Cleaners" },
});

/** Test-mode client (sk_test_…). Present only when the test key is set — lets
 *  the full card flow run with test cards without touching live money. */
export const stripeTest = process.env.STRIPE_SECRET_KEY_TEST
  ? new Stripe(process.env.STRIPE_SECRET_KEY_TEST, { apiVersion, typescript: true, appInfo: { name: "Ample Cleaners (test)" } })
  : null;
