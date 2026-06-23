/* Roomora — "Shop this look" client service.
   Two-step, credit-conserving flow against /api/shop:
     1. itemize(generationId) — cheap: breaks the design into shoppable items
        (cached server-side). No product search runs yet.
     2. search(generationId, keys) — for the items the user ticked, runs a live
        Google Shopping (France) search + vision match per item, budget-allocated.
        Results are cached per design+item, so re-runs cost nothing. */

"use client";

import type { ShopCategory } from "../shop/categories";

/** One spotted design item for the checklist (no products yet). */
export interface ShopItem {
  key: number;
  category: ShopCategory;
  tier: "hero" | "minor";
  label: string;
}

/** A buyable product card returned for a selected item. */
export interface ShopProduct {
  title: string;
  price: number | null;
  currency: string;
  imageUrl: string | null;
  deeplink: string | null;
  brand: string | null;
  overBudget?: boolean;
}

/** A selected item with its matched products. */
export interface ShopGroup {
  key: number;
  item: { category: ShopCategory; label: string; query: string };
  products: ShopProduct[];
}

export interface ItemizeResult {
  generationId: string;
  items: ShopItem[];
}

export interface ShopResult {
  generationId: string;
  groups: ShopGroup[];
  /** Market the search ran in (country code). */
  country?: string;
  /** Credit balance after the (possibly charged) search; null if not charged. */
  balance?: number | null;
}

async function postShop<T>(payload: Record<string, unknown>): Promise<T> {
  const res = await fetch("/api/shop", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error((detail as { error?: string }).error ?? "shop_failed");
  }
  return (await res.json()) as T;
}

export const shopService = {
  /** Break a design into shoppable items (cheap, no product search). */
  itemize(generationId: string): Promise<ItemizeResult> {
    return postShop<ItemizeResult>({ generationId, action: "itemize" });
  },

  /** Search + match products for the chosen item keys in a given market. */
  search(generationId: string, keys: number[], country: string): Promise<ShopResult> {
    return postShop<ShopResult>({ generationId, action: "search", keys, country });
  },
};
