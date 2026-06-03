/* Roomora — "Shop this look" shared category vocabulary.
   Kept in sync with scripts/ingest-awin.mjs (the ingestion normalizer). */

export const SHOP_CATEGORIES = [
  "sofa",
  "armchair",
  "coffee_table",
  "side_table",
  "rug",
  "floor_lamp",
  "table_lamp",
  "shelving",
  "plant",
  "wall_art",
  "cushion",
  "other",
] as const;

export type ShopCategory = (typeof SHOP_CATEGORIES)[number];

/** Coerce an arbitrary string to a valid ShopCategory ("other" fallback). */
export function asShopCategory(value: unknown): ShopCategory {
  return SHOP_CATEGORIES.includes(value as ShopCategory)
    ? (value as ShopCategory)
    : "other";
}

/** Bilingual display labels for each category. */
export const CATEGORY_LABELS: Record<ShopCategory, [string, string]> = {
  sofa: ["Sofa", "沙发"],
  armchair: ["Armchair", "扶手椅"],
  coffee_table: ["Coffee table", "茶几"],
  side_table: ["Side table", "边几"],
  rug: ["Rug", "地毯"],
  floor_lamp: ["Floor lamp", "落地灯"],
  table_lamp: ["Table lamp", "台灯"],
  shelving: ["Shelving", "置物架"],
  plant: ["Plant", "植物"],
  wall_art: ["Wall art", "装饰画"],
  cushion: ["Cushion", "靠垫"],
  other: ["Decor", "饰品"],
};
