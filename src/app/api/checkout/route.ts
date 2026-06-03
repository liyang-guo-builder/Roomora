import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { PACKS } from "@/lib/packs";

export const runtime = "nodejs";

interface CheckoutBody {
  packIndex?: number;
}

/**
 * POST /api/checkout  { packIndex }
 * Creates a Stripe Checkout Session for one credit pack and returns its url.
 * Server-authoritative: requires a signed-in session, validates packIndex
 * against the canonical PACKS, and stamps user_id + credits into the session
 * metadata so the webhook can credit the right account. Credits are NOT added
 * here; only the webhook (checkout.session.completed) grants them.
 *
 * Deploy-inert: returns 503 when STRIPE_SECRET_KEY is unset.
 */
export async function POST(request: NextRequest) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "stripe_not_configured" }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: CheckoutBody;
  try {
    body = (await request.json()) as CheckoutBody;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const packIndex = body.packIndex;
  if (
    typeof packIndex !== "number" ||
    !Number.isInteger(packIndex) ||
    packIndex < 0 ||
    packIndex >= PACKS.length
  ) {
    return NextResponse.json({ error: "invalid_pack" }, { status: 400 });
  }
  const pack = PACKS[packIndex];

  // Origin for success/cancel redirects: prefer the request origin, fall back
  // to the configured public app url.
  const origin =
    request.headers.get("origin") ??
    process.env.NEXT_PUBLIC_APP_URL ??
    new URL(request.url).origin;

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    // TODO: enable wechat_pay + alipay payment methods once activated in the Stripe dashboard
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "eur",
          unit_amount: pack.eur * 100,
          product_data: {
            name: `Roomora — ${pack.c} credits`,
          },
        },
      },
    ],
    metadata: {
      user_id: user.id,
      pack_index: String(packIndex),
      credits: String(pack.c),
    },
    success_url: `${origin}/account?purchase=success`,
    cancel_url: `${origin}/account?purchase=cancelled`,
  });

  return NextResponse.json({ url: session.url });
}
