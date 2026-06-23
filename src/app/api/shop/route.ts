import { NextResponse, type NextRequest } from "next/server";
import sharp from "sharp";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { detectItems, type DetectedItem } from "@/lib/shop/detect";
import { describeCrop } from "@/lib/shop/describe";
import { searchProducts } from "@/lib/shop/search";
import { judgeMatches } from "@/lib/shop/judge";
import { bandToTotal, itemCap } from "@/lib/shop/budget";
import { getCountry } from "@/lib/shop/countries";
import { asShopCategory } from "@/lib/shop/categories";
import type { BudgetId } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const LOOKALIKE_MIN = 80;
const FALLBACK_MIN = 62;
const PER_ITEM = 3;
const CROP_PAD = 24;

interface ShopBody {
  generationId?: string;
  action?: "itemize" | "search";
  keys?: number[];
  country?: string;
}

interface ShopProduct {
  title: string;
  price: number | null;
  currency: string;
  imageUrl: string | null;
  deeplink: string | null;
  brand: string | null;
  overBudget: boolean;
}
interface ShopGroup {
  key: number;
  item: { category: string; label: string };
  products: ShopProduct[];
}

/** Coerce a cached/parsed object into a DetectedItem (tolerates older rows). */
function asDetected(o: Record<string, unknown>): DetectedItem {
  const box = (o.box ?? {}) as Record<string, unknown>;
  const num = (v: unknown) => (typeof v === "number" ? v : 0);
  const category = asShopCategory(o.category);
  return {
    category,
    tier: o.tier === "minor" ? "minor" : "hero",
    label: typeof o.label === "string" && o.label ? o.label : category,
    box: { x: num(box.x), y: num(box.y), w: num(box.w), h: num(box.h) },
  };
}

export async function POST(request: NextRequest) {
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

  // Registered users only.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const falKey = process.env.FAL_KEY;
  const minimaxKey = process.env.MINIMAX_API_KEY;
  const searchKey = process.env.SEARCHAPI_KEY;
  const admin = createAdminClient();

  const { data: gen, error: genErr } = await admin
    .from("generations")
    .select("id, result_url, budget, items, shop_results, shop_paid")
    .eq("id", generationId)
    .single();
  if (genErr || !gen) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const resultUrl = gen.result_url as string | null;
  if (!resultUrl) {
    return NextResponse.json({ error: "no_result_image" }, { status: 400 });
  }

  // ── Detect items once (Florence-2), cache on the row. ──
  let items: DetectedItem[];
  const cached = gen.items as unknown[] | null;
  if (Array.isArray(cached) && cached.length > 0) {
    items = cached.map((it) => asDetected(it as Record<string, unknown>));
  } else {
    if (!falKey) {
      return NextResponse.json({ error: "detector_not_configured" }, { status: 500 });
    }
    try {
      items = await detectItems(resultUrl, falKey);
    } catch (err) {
      const detail = err instanceof Error ? err.message : "detect_failed";
      return NextResponse.json({ error: "detect_failed", detail }, { status: 502 });
    }
    await admin.from("generations").update({ items }).eq("id", generationId).then(() => {});
  }

  // ── action: itemize → checklist only (no paid search). ──
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

  // ── action: search ──
  if (!searchKey || !minimaxKey) {
    return NextResponse.json({ error: "search_not_configured" }, { status: 500 });
  }
  const country = getCountry(body.country);
  const validKeys = (body.keys ?? []).filter(
    (k) => Number.isInteger(k) && k >= 0 && k < items.length,
  );
  if (validKeys.length === 0) {
    return NextResponse.json({ error: "no_items_selected" }, { status: 400 });
  }

  // Fetch the design image once for cropping.
  let design: Buffer;
  let dim: { width: number; height: number };
  try {
    const r = await fetch(resultUrl);
    if (!r.ok) throw new Error(`design_fetch ${r.status}`);
    design = Buffer.from(await r.arrayBuffer());
    const meta = await sharp(design).metadata();
    dim = { width: meta.width ?? 0, height: meta.height ?? 0 };
  } catch {
    return NextResponse.json({ error: "design_unavailable" }, { status: 502 });
  }

  const total = bandToTotal((gen.budget as BudgetId | null) ?? null);
  const cache = (gen.shop_results as Record<string, ShopProduct[]> | null) ?? {};
  const cacheKey = (key: number) => `${country.code}:${key}`;

  // Charge 1 credit once per design (re-shopping / more items / other countries
  // on the same design are free).
  let balance: number | null = null;
  let charged = false;
  if (gen.shop_paid !== true) {
    const { data, error } = await supabase.rpc("spend_credits", { p_amount: 1, p_reason: "shop" });
    if (error) {
      return NextResponse.json({ error: "insufficient_credits" }, { status: 402 });
    }
    balance = data as number;
    charged = true;
  }

  async function cropDataUri(box: DetectedItem["box"]): Promise<string> {
    const left = Math.max(0, Math.round(box.x - CROP_PAD));
    const top = Math.max(0, Math.round(box.y - CROP_PAD));
    const width = Math.min(dim.width - left, Math.round(box.w + CROP_PAD * 2));
    const height = Math.min(dim.height - top, Math.round(box.h + CROP_PAD * 2));
    const buf = await sharp(design)
      .extract({ left, top, width: Math.max(1, width), height: Math.max(1, height) })
      .resize(320, 320, { fit: "inside" })
      .jpeg({ quality: 80 })
      .toBuffer();
    return `data:image/jpeg;base64,${buf.toString("base64")}`;
  }

  const groups = await Promise.all(
    validKeys.map(async (key): Promise<ShopGroup | null> => {
      const item = items[key];

      const hit = cache[cacheKey(key)];
      if (Array.isArray(hit)) {
        return { key, item: { category: item.category, label: item.label }, products: hit };
      }

      try {
        const crop = await cropDataUri(item.box);
        const { query, target } = await describeCrop(crop, item.label, country.lang, minimaxKey!);
        const raw = await searchProducts(query, searchKey!, country, 8);
        if (raw.length === 0) return null;
        const scores = await judgeMatches(crop, target, raw, minimaxKey!);
        const cap = itemCap(total, item.category);
        const scored = raw
          .map((r, i) => ({ r, score: scores[i] ?? 0 }))
          .sort((a, b) => b.score - a.score);

        let pool = scored.filter((s) => s.score >= LOOKALIKE_MIN);
        if (pool.length === 0) pool = scored.filter((s) => s.score >= FALLBACK_MIN).slice(0, 2);
        if (pool.length === 0) return null;

        const inBudget = cap == null ? pool : pool.filter((s) => s.r.price != null && s.r.price <= cap);
        const chosen = [...inBudget];
        for (const s of pool) {
          if (chosen.length >= PER_ITEM) break;
          if (!chosen.includes(s)) chosen.push(s);
        }
        const products: ShopProduct[] = chosen.slice(0, PER_ITEM).map(({ r }) => ({
          title: r.title,
          price: r.price,
          currency: country.currency,
          imageUrl: r.thumbnail,
          deeplink: r.link,
          brand: r.seller,
          overBudget: cap != null && r.price != null && r.price > cap,
        }));
        if (products.length === 0) return null;
        cache[cacheKey(key)] = products;
        return { key, item: { category: item.category, label: item.label }, products };
      } catch {
        return null; // one item failing shouldn't sink the rest
      }
    }),
  );

  const result = groups.filter((g): g is ShopGroup => g !== null);

  if (charged && result.length === 0) {
    const { data } = await admin.rpc("add_credits_for", {
      p_user_id: user.id,
      p_amount: 1,
      p_reason: "shop_refund",
    });
    if (typeof data === "number") balance = data;
  } else {
    await admin
      .from("generations")
      .update(charged ? { shop_results: cache, shop_paid: true } : { shop_results: cache })
      .eq("id", generationId)
      .then(({ error }) => {
        if (error) console.error("shop_results cache write failed:", error.message);
      });
  }

  return NextResponse.json({ generationId, country: country.code, groups: result, balance });
}
