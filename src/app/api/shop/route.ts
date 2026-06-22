import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { itemizeDesign, type DesignItem } from "@/lib/shop/itemizer";
import { asShopCategory } from "@/lib/shop/categories";
import { searchProductsFR } from "@/lib/shop/search";
import { judgeMatches } from "@/lib/shop/judge";
import { bandToTotal, itemCap } from "@/lib/shop/budget";
import type { BudgetId } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Score at or above which a candidate counts as a genuine look-alike. */
const LOOKALIKE_MIN = 80;
/** Looser floor used only as a fallback when nothing clears LOOKALIKE_MIN. */
const FALLBACK_MIN = 62;
/** Cards shown per item. */
const PER_ITEM = 3;

interface ShopBody {
  generationId?: string;
  action?: "itemize" | "search";
  /** For action:"search" — indices into the cached items array. */
  keys?: number[];
}

interface ShopProduct {
  title: string;
  price: number | null;
  currency: string;
  imageUrl: string | null;
  deeplink: string | null;
  brand: string | null;
  /** True when priced above this item's budget slice (shown but flagged). */
  overBudget: boolean;
}

interface ShopGroup {
  key: number;
  item: { category: string; label: string; query: string };
  products: ShopProduct[];
}

/** Coerce a cached/parsed object into a DesignItem (tolerates legacy shapes). */
function asItem(o: Partial<DesignItem> & Record<string, unknown>): DesignItem {
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const query = str(o.query);
  return {
    category: asShopCategory(o.category),
    tier: o.tier === "minor" ? "minor" : "hero",
    label: str(o.label) || query,
    query,
    target: str(o.target),
    color: str(o.color),
    material: str(o.material),
  };
}

export async function POST(request: NextRequest) {
  // Server-side gate (also used to hide the UI). Until this is "true" the route
  // is closed so the paid vision/search calls can't be triggered.
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
  const action = body.action ?? "itemize";
  if (!generationId) {
    return NextResponse.json({ error: "missing_generation_id" }, { status: 400 });
  }

  const minimaxKey = process.env.MINIMAX_API_KEY;
  const searchKey = process.env.SEARCHAPI_KEY;
  const admin = createAdminClient();

  // ── Load the generation (admin bypasses RLS; allows anon rows). ──
  const { data: gen, error: genErr } = await admin
    .from("generations")
    .select("id, result_url, budget, items, shop_results")
    .eq("id", generationId)
    .single();
  if (genErr || !gen) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const resultUrl = gen.result_url as string | null;
  if (!resultUrl) {
    return NextResponse.json({ error: "no_result_image" }, { status: 400 });
  }

  // ── Itemize once (cheap MiniMax vision call), cache onto the row. ──
  let items: DesignItem[];
  const cached = gen.items as unknown[] | null;
  if (Array.isArray(cached) && cached.length > 0) {
    items = cached.map((it) => asItem(it as Record<string, unknown>));
  } else {
    if (!minimaxKey) {
      return NextResponse.json({ error: "itemizer_not_configured" }, { status: 500 });
    }
    try {
      items = await itemizeDesign(resultUrl, minimaxKey);
    } catch (err) {
      const detail = err instanceof Error ? err.message : "itemize_failed";
      return NextResponse.json({ error: "itemize_failed", detail }, { status: 502 });
    }
    await admin.from("generations").update({ items }).eq("id", generationId).then(() => {});
  }

  // ── action: itemize → return the checklist (no paid search). ──
  if (action === "itemize") {
    return NextResponse.json({
      generationId,
      items: items.map((it, key) => ({
        key,
        category: it.category,
        tier: it.tier,
        label: it.label,
      })),
    });
  }

  // ── action: search → for each selected item, live search + judge + budget. ──
  if (!searchKey) {
    return NextResponse.json({ error: "search_not_configured" }, { status: 500 });
  }
  if (!minimaxKey) {
    return NextResponse.json({ error: "judge_not_configured" }, { status: 500 });
  }
  const validKeys = (body.keys ?? []).filter(
    (k) => Number.isInteger(k) && k >= 0 && k < items.length,
  );
  if (validKeys.length === 0) {
    return NextResponse.json({ error: "no_items_selected" }, { status: 400 });
  }

  const total = bandToTotal((gen.budget as BudgetId | null) ?? null);
  const cache = (gen.shop_results as Record<string, ShopProduct[]> | null) ?? {};

  const groups = await Promise.all(
    validKeys.map(async (key): Promise<ShopGroup | null> => {
      const item = items[key];
      if (!item.query) return null;

      // Serve cached products if we already searched this item for this design.
      const hit = cache[String(key)];
      if (Array.isArray(hit)) {
        return { key, item: pick(item), products: hit };
      }

      let products: ShopProduct[] = [];
      try {
        const raw = await searchProductsFR(item.query, searchKey);
        const scores = await judgeMatches(resultUrl, item, raw, minimaxKey);
        const cap = itemCap(total, item.category);
        const scored = raw
          .map((r, i) => ({ r, score: scores[i] ?? 0 }))
          .sort((a, b) => b.score - a.score);

        let pool = scored.filter((s) => s.score >= LOOKALIKE_MIN);
        if (pool.length === 0) pool = scored.filter((s) => s.score >= FALLBACK_MIN).slice(0, 2);

        // Budget as a SOFT guide: prefer in-slice matches, top up with the best
        // look-alikes (flagged over budget) so we never show an empty item.
        const inBudget = cap == null ? pool : pool.filter((s) => s.r.price != null && s.r.price <= cap);
        const chosen = [...inBudget];
        if (chosen.length < PER_ITEM) {
          for (const s of pool) {
            if (chosen.length >= PER_ITEM) break;
            if (!chosen.includes(s)) chosen.push(s);
          }
        }
        products = chosen.slice(0, PER_ITEM).map(({ r }) => ({
          title: r.title,
          price: r.price,
          currency: "EUR",
          imageUrl: r.thumbnail,
          deeplink: r.link,
          brand: r.seller,
          overBudget: cap != null && r.price != null && r.price > cap,
        }));
      } catch {
        return null; // a single item's search failing shouldn't sink the rest
      }

      if (products.length === 0) return null;
      cache[String(key)] = products; // accumulate for the cache write
      return { key, item: pick(item), products };
    }),
  );

  const result = groups.filter((g): g is ShopGroup => g !== null);

  // Persist the (merged) cache best-effort — never fail the request on a write.
  await admin
    .from("generations")
    .update({ shop_results: cache })
    .eq("id", generationId)
    .then(({ error }) => {
      if (error) console.error("shop_results cache write failed:", error.message);
    });

  return NextResponse.json({ generationId, groups: result });
}

function pick(item: DesignItem): { category: string; label: string; query: string } {
  return { category: item.category, label: item.label, query: item.query };
}
