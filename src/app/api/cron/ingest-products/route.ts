import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseAwinFeed } from "@/lib/shop/feed";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * GET /api/cron/ingest-products  (nightly cron)
 * Re-ingests the Awin product feed into public.products (idempotent upsert on
 * advertiser+external_id). Gated by CRON_SECRET — rejects anything without the
 * matching Bearer token (Vercel Cron sends `Authorization: Bearer $CRON_SECRET`).
 *
 * Feed source: AWIN_FEED_URL (downloaded CSV). If unset the cron is a no-op
 * (the sample fixture is seeded via `node scripts/ingest-awin.mjs`, not here).
 *
 * To schedule on Vercel, add to vercel.json:
 *   "crons": [{ "path": "/api/cron/ingest-products", "schedule": "0 3 * * *" }]
 * Vercel automatically attaches the CRON_SECRET bearer to scheduled invocations.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "cron_not_configured" }, { status: 503 });
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const feedUrl = process.env.AWIN_FEED_URL;
  if (!feedUrl) {
    return NextResponse.json({ ok: true, ingested: 0, note: "no_feed_url" });
  }

  let csv: string;
  try {
    const res = await fetch(feedUrl);
    if (!res.ok) throw new Error(`feed download failed: ${res.status}`);
    csv = await res.text();
  } catch (err) {
    const detail = err instanceof Error ? err.message : "feed_fetch_failed";
    return NextResponse.json({ error: "feed_fetch_failed", detail }, { status: 502 });
  }

  const products = parseAwinFeed(csv);
  if (products.length === 0) {
    return NextResponse.json({ ok: true, ingested: 0, note: "empty_feed" });
  }

  const admin = createAdminClient();
  // Upsert in chunks to stay within payload limits on large feeds.
  const CHUNK = 500;
  for (let i = 0; i < products.length; i += CHUNK) {
    const { error } = await admin
      .from("products")
      .upsert(products.slice(i, i + CHUNK), { onConflict: "advertiser,external_id" });
    if (error) {
      return NextResponse.json(
        { error: "upsert_failed", detail: error.message, ingestedBefore: i },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ ok: true, ingested: products.length });
}
