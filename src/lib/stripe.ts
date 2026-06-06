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

// Cache the account's active alt-payment capabilities briefly so we don't hit
// the Stripe API on every checkout, but still pick up newly-activated methods
// (WeChat Pay / Alipay) within a few minutes without a redeploy.
let pmCache: {
  methods: Stripe.Checkout.SessionCreateParams.PaymentMethodType[];
  at: number;
} | null = null;
const PM_TTL_MS = 5 * 60 * 1000;

/**
 * Returns the payment method types to offer at checkout, based on what the
 * connected account actually has ACTIVE. Card is always included; WeChat Pay
 * and Alipay are added only when their capabilities are active (so going live
 * before they clear review does not break checkout). On any error, falls back
 * to card-only.
 */
export async function getActivePaymentMethodTypes(): Promise<
  Stripe.Checkout.SessionCreateParams.PaymentMethodType[]
> {
  const now = Date.now();
  if (pmCache && now - pmCache.at < PM_TTL_MS) return pmCache.methods;
  const methods: Stripe.Checkout.SessionCreateParams.PaymentMethodType[] = ["card"];
  try {
    // Raw account fetch (the SDK's Capabilities type does not list WeChat/Alipay).
    const res = await fetch("https://api.stripe.com/v1/account", {
      headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY ?? ""}` },
    });
    if (res.ok) {
      const acct = (await res.json()) as {
        capabilities?: Record<string, string>;
      };
      const cap = acct.capabilities ?? {};
      if (cap.wechat_pay_payments === "active") methods.push("wechat_pay");
      if (cap.alipay_payments === "active") methods.push("alipay");
    }
  } catch {
    // Safe fallback: card-only.
  }
  pmCache = { methods, at: now };
  return methods;
}
