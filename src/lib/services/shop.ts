/* Roomora — "Shop this look" client service.
   Calls the server-authoritative /api/shop route, which itemizes a generated
   design and matches each item to affiliate products. */

"use client";

import type { ShopCategory } from "../shop/categories";

/** A buyable product card returned for a design item. */
export interface ShopProduct {
  title: string;
  price: number | null;
  currency: string;
  imageUrl: string | null;
  deeplink: string | null;
  brand: string | null;
}

/** One spotted design item with its matched products. */
export interface ShopGroup {
  item: {
    category: ShopCategory;
    query: string;
    color: string;
    material: string;
  };
  products: ShopProduct[];
}

export interface ShopResult {
  generationId: string;
  groups: ShopGroup[];
}

export const shopService = {
  /** Fetch grouped, shoppable products for a generated design. */
  async getShop(generationId: string): Promise<ShopResult> {
    const res = await fetch("/api/shop", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ generationId }),
    });
    if (!res.ok) {
      const detail = await res.json().catch(() => ({}));
      throw new Error((detail as { error?: string }).error ?? "shop_failed");
    }
    return (await res.json()) as ShopResult;
  },
};
