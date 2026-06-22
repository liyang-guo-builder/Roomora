/* Roomora — "Shop this look" budget allocation (pure, unit-tested).
   The design's budget band represents the TOTAL for the whole look. We split it
   across items by category weight (the sofa gets the biggest slice) and use the
   per-item cap as a SOFT guide: products are ranked and flagged against it, never
   hard-deleted, so a search never returns an empty result. */

import type { BudgetId } from "../types";
import type { ShopCategory } from "./categories";

/** Map the chosen budget band to a total euro figure for the whole look.
 *  null = no budget set → no cap (show matches at any price). */
export function bandToTotal(budget: BudgetId | null): number | null {
  switch (budget) {
    case "low":
      return 800;
    case "mid":
      return 2000;
    case "high":
      return 4000;
    case "skip":
    case null:
    case undefined:
    default:
      return null;
  }
}

/** Each category's share of the TOTAL look budget. The sofa is weighted highest;
 *  shares need not sum to 1 (a user may shop only some items, and the rest of the
 *  budget is simply reserved). Validated against real French retailer prices. */
export const CATEGORY_WEIGHTS: Record<ShopCategory, number> = {
  sofa: 0.4,
  armchair: 0.12,
  coffee_table: 0.1,
  side_table: 0.05,
  rug: 0.12,
  floor_lamp: 0.08,
  table_lamp: 0.05,
  shelving: 0.15,
  wall_art: 0.05,
  plant: 0.03,
  cushion: 0.03,
  other: 0.06,
};

/** Per-item budget slice: total * category weight, rounded. null total → null
 *  (no cap). */
export function itemCap(
  total: number | null,
  category: ShopCategory,
): number | null {
  if (total == null) return null;
  const weight = CATEGORY_WEIGHTS[category] ?? CATEGORY_WEIGHTS.other;
  return Math.round(total * weight);
}
