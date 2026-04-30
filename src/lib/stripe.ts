import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY ?? "";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(key, { apiVersion: "2026-04-22.dahlia" });
  }
  return _stripe;
}

/** Stripe public key forwarded to the client if needed */
export const STRIPE_PK = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";

/** Price ID for the monthly Premium subscription */
export const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID ?? "";

/** Webhook signing secret */
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "";
