/* Roomora — canonical credit pack catalogue.
   ONE source of truth: the mock payment service and the server-side
   /api/checkout route both import PACKS from here so prices can never drift.
   Shape is { c, eur, cny, best? } — credits, EUR price, CNY price, best-value flag. */

import type { CreditPack } from "./types";

/** Credit packs (keep these exact values; they back both pricing and Stripe). */
export const PACKS: CreditPack[] = [
  { c: 20, eur: 5, cny: 38 },
  { c: 60, eur: 12, cny: 92, best: true },
  { c: 150, eur: 25, cny: 188 },
];
