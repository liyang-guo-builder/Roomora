import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { itemizeDesign, type DesignItem } from "@/lib/shop/itemizer";
import { asShopCategory } from "@/lib/shop/categories";
import type { BudgetId } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

interface ShopBody {
  generationId?: string;
}

/** Map the design's budget band → a max product price (null = no cap). */
function budgetCap(budget: BudgetId | null): number | null {
  switch (budget) {
    case "low":
      return 150;
    case "mid":
      return 500;
    case "high":
    case "skip":
    default:
      return null;
  }
}

interface ProductRow {
  title: string | null;
  price: number | null;
  currency: string | null;
  image_url: string | null;
  deeplink: string | null;
  brand: string | null;
}

interface ProductCard {
  title: string;
  price: number | null;
  currency: string;
  imageUrl: string | null;
  deeplink: string | null;
  brand: string | null;
}

function toCard(r: ProductRow): ProductCard {
  return {
    title: r.title ?? "",
    price: r.price,
    currency: r.currency ?? "EUR",
    imageUrl: r.image_url,
    deeplink: r.deeplink,
    brand: r.brand,
  };
}

/**
 * POST /api/shop  { generationId }
 * Matches the items visible in a generated design to real, buyable affiliate
 * products. Itemizes the design once (cached on generations.items), then for
 * each item queries the products catalog by category + full-text relevance,
 * price-banded by the generation's budget. Returns grouped product cards.
 *
 * Anonymous-friendly: a generation row may have a null user_id. We only require
 * the generationId to resolve to an existing row (catalog data is public).
 */
export async function POST(request: NextRequest) {
  // Server-side gate: the route triggers paid vision calls, so it must not be
  // reachable while the feature is parked. NEXT_PUBLIC_SHOP_LIVE is read here on
  // the server (not just used to hide the UI). When the live-search version is
  // built, this gains per-user rate limiting (device cookie + IP, like
  // /api/generate) before the flag is flipped on.
  if (process.env.NEXT_PUBLIC_SHOP_LIVE !== "true") {
    return NextResponse.json({ error: "shop_disabled" }, { status: 503 });
  }

  let body: ShopBody;
  try {
    body = (await request.json()) as ShopBody;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const generationId = body.generationId;
  if (!generationId) {
    return NextResponse.json({ error: "missing_generation_id" }, { status: 400 });
  }

  const admin = createAdminClient();

  // ── Load the generation (admin bypasses RLS; allows anon rows). ──
  const { data: gen, error: genErr } = await admin
    .from("generations")
    .select("id, result_url, budget, items")
    .eq("id", generationId)
    .single();
  if (genErr || !gen) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const resultUrl = gen.result_url as string | null;
  if (!resultUrl) {
    return NextResponse.json({ error: "no_result_image" }, { status: 400 });
  }
  const budget = (gen.budget as BudgetId | null) ?? null;
  const cap = budgetCap(budget);

  // ── Itemize once, then cache onto the row. ──
  let items: DesignItem[];
  const cached = gen.items as DesignItem[] | null;
  if (Array.isArray(cached) && cached.length > 0) {
    items = cached.map((it) => ({
      category: asShopCategory(it.category),
      query: typeof it.query === "string" ? it.query : "",
      color: typeof it.color === "string" ? it.color : "",
      material: typeof it.material === "string" ? it.material : "",
    }));
  } else {
    const minimaxKey = process.env.MINIMAX_API_KEY;
    if (!minimaxKey) {
      return NextResponse.json({ error: "itemizer_not_configured" }, { status: 500 });
    }
    try {
      items = await itemizeDesign(resultUrl, minimaxKey);
    } catch (err) {
      const detail = err instanceof Error ? err.message : "itemize_failed";
      return NextResponse.json(
        { error: "itemize_failed", detail },
        { status: 502 },
      );
    }
    // Cache (best-effort — don't fail the request if the write hiccups).
    await admin
      .from("generations")
      .update({ items })
      .eq("id", generationId)
      .then(() => {});
  }

  // ── For each item, match products. ──
  const groups: { item: DesignItem; products: ProductCard[] }[] = [];
  for (const item of items) {
    if (!item.query) continue;

    // Exact category first.
    let rows: ProductRow[] = [];
    const exact = await admin.rpc("search_products", {
      p_category: item.category,
      p_query: item.query,
      p_max_price: cap,
      p_limit: 5,
    });
    if (!exact.error && Array.isArray(exact.data)) {
      rows = exact.data as ProductRow[];
    }

    // Fallback: relevance across any category if the exact-category FTS missed.
    if (rows.length === 0) {
      const any = await admin.rpc("search_products", {
        p_category: null,
        p_query: item.query,
        p_max_price: cap,
        p_limit: 5,
      });
      if (!any.error && Array.isArray(any.data)) {
        rows = any.data as ProductRow[];
      }
    }

    if (rows.length === 0) continue; // skip items with zero matches
    groups.push({ item, products: rows.map(toCard) });
  }

  return NextResponse.json({ generationId, groups });
}
