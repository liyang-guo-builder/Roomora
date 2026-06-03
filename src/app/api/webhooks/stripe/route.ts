import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { PACKS } from "@/lib/packs";

export const runtime = "nodejs";

/**
 * POST /api/webhooks/stripe
 * Server-authoritative credit grant. Stripe calls this after a successful
 * Checkout payment. We verify the signature, then on checkout.session.completed
 * credit the user via the SECURITY DEFINER add_credits_for RPC.
 *
 * Idempotency: a unique insert into stripe_payments keyed on the session id is
 * the guard. If the session was already processed the insert conflicts and we
 * return 200 without crediting again (Stripe retries on non-2xx).
 *
 * Deploy-inert: returns 503 when STRIPE_WEBHOOK_SECRET is unset.
 */
export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "stripe_not_configured" }, { status: 503 });
  }

  // Raw body is required for signature verification (do not parse as JSON first).
  const rawBody = await request.text();
  const sig = request.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "missing_signature" }, { status: 400 });
  }

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch {
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  // Credit on a completed checkout (cards confirm synchronously) OR on a
  // successful async payment (WeChat Pay / Alipay settle a few seconds later
  // and fire async_payment_succeeded). The payment_status === 'paid' guard
  // below + the unique-session idempotency insert make the two events safe
  // together: a card pays once on 'completed'; an async method skips 'completed'
  // (still unpaid) and credits on 'async_payment_succeeded'. Acknowledge the rest.
  if (
    event.type !== "checkout.session.completed" &&
    event.type !== "checkout.session.async_payment_succeeded"
  ) {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  // Only credit once the money has actually arrived. Cards report 'paid' at
  // completion, so this is a no-op for the current card-only flow. But WeChat
  // Pay and Alipay settle asynchronously: the session can complete while the
  // payment is still 'unpaid'/'processing'. Failing closed here means we never
  // grant credits before payment confirms.
  // TODO: when wechat_pay/alipay are enabled, also handle the
  // 'checkout.session.async_payment_succeeded' event (same crediting logic).
  if (session.payment_status !== "paid") {
    return NextResponse.json({ received: true });
  }

  const meta = session.metadata ?? {};
  const userId = meta.user_id;
  const packIndex = meta.pack_index != null ? Number(meta.pack_index) : NaN;
  const credits = meta.credits != null ? Number(meta.credits) : NaN;

  if (!userId || !Number.isInteger(credits) || credits <= 0) {
    // Nothing actionable; acknowledge so Stripe stops retrying.
    return NextResponse.json({ received: true });
  }

  const amountEur =
    Number.isInteger(packIndex) && PACKS[packIndex] ? PACKS[packIndex].eur : null;

  const admin = createAdminClient();

  // Idempotency guard: the unique stripe_session_id makes a duplicate webhook
  // delivery conflict here, so credits are granted at most once per session.
  const { error: insertError } = await admin.from("stripe_payments").insert({
    user_id: userId,
    stripe_session_id: session.id,
    pack_index: Number.isInteger(packIndex) ? packIndex : null,
    credits,
    amount_eur: amountEur,
    status: "pending",
  });

  if (insertError) {
    // 23505 = unique_violation → already processed. Acknowledge without crediting.
    if (insertError.code === "23505") {
      return NextResponse.json({ received: true });
    }
    return NextResponse.json(
      { error: "insert_failed", detail: insertError.message },
      { status: 500 },
    );
  }

  // First time we have seen this session: grant the credits server-side.
  const { error: rpcError } = await admin.rpc("add_credits_for", {
    p_user_id: userId,
    p_amount: credits,
    p_reason: "stripe_purchase",
  });

  if (rpcError) {
    // Leave the row as 'pending' so a manual replay can reconcile it.
    return NextResponse.json(
      { error: "credit_failed", detail: rpcError.message },
      { status: 500 },
    );
  }

  await admin
    .from("stripe_payments")
    .update({ status: "completed" })
    .eq("stripe_session_id", session.id);

  return NextResponse.json({ received: true });
}
