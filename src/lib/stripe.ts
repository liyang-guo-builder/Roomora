/* Roomora — server-only Stripe client.
   Lazily constructs the SDK from STRIPE_SECRET_KEY so the module is
   deploy-inert until the key is set: importing it never throws, and
   isStripeConfigured() lets route handlers return 503 when unconfigured.
   NEVER import this into a client component — the secret must stay server-side. */

import Stripe from "stripe";

/** True when the Stripe secret key is present in the environment. */
export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

let cached: Stripe | null = null;

/**
 * Returns the singleton Stripe client. Call only after isStripeConfigured()
 * is true (route handlers guard with a 503 otherwise). The apiVersion is
 * pinned to the version the installed SDK (stripe@22) expects.
 */
export function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("stripe_not_configured");
  }
  if (!cached) {
    cached = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-05-27.dahlia",
    });
  }
  return cached;
}
